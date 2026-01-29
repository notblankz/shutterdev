// process the high-resolution image -> resize it, extract data and optimize it
package services

import (
	"bytes"
	"errors"
	"fmt"
	"image"
	"image/jpeg"
	"io"
	"log"
	"shutterdev/backend/internal/models"
	"sync"

	"github.com/HugoSmits86/nativewebp"
	"github.com/disintegration/imaging"
	"github.com/nfnt/resize"
	"github.com/rwcarlsen/goexif/exif"
)

func ProcessImage(file io.Reader) (webImage []byte, thumbImage []byte, exifData models.Exif, thumbWidth int, thumbHeight int, err error) {

	const MaxTotalPixelCount = 8000 * 8000 // Image width * Image height
	var errExif error = nil
	var errWeb error = nil
	var errThumb error = nil
	var imageOrientation int

	// Copy the image byte stream into a bucket so that it can be reused
	imageData, err := io.ReadAll(file)
	if err != nil {
		log.Println("[ERROR]: Could not dump Image Stream into Byte Slice", err)
		return nil, nil, models.Exif{}, 0, 0, err
	}

	// <== Check Dimensions of Image & assign isPortrait value ==>
	decodeConfigReader := bytes.NewReader(imageData)
	imageConfig, _, err := image.DecodeConfig(decodeConfigReader)
	if err != nil {
		log.Println("[ERROR]: DecodeConfig failed to extract dimensions of the image")
		return nil, nil, models.Exif{}, 0, 0, err
	} else if (imageConfig.Width * imageConfig.Height) > MaxTotalPixelCount {
		log.Println("[ERROR]: Image Dimensions are bigger than allowed dimensions")
		ErrImageTooLarge := errors.New("Provided image exceeds the maximum dimensions")
		return nil, nil, models.Exif{}, 0, 0, ErrImageTooLarge
	}

	exifData, imageOrientation, errExif = extractExif(imageData)

	var wg sync.WaitGroup

	// again create a new Reader for Resizing from the bucket (ImageData)
	resizeImageReader := bytes.NewReader(imageData)

	// Convert byte stream into image.Image object for manipulation
	img, _, err := image.Decode(resizeImageReader)
	if err != nil {
		log.Println("[ERROR]: Could not decode Image to image.Image", err)
		return nil, nil, exifData, 0, 0, err
	}

	rotatedImg := applyOrientation(img, imageOrientation)

	wg.Go(func() {
		webImage, errWeb = resizeToWeb(rotatedImg)
	})

	wg.Go(func() {
		thumbImage, thumbWidth, thumbHeight, errThumb = resizeToThumb(rotatedImg)
	})

	wg.Wait()

	if errExif != nil {
		log.Println("[WARNING]: No EXIF data found or decode error: ", errExif)
	} else if errThumb != nil {
		log.Println("[ERROR]: Could not encode image.Image back to JPEG (for thumbImage)", errThumb)
		return nil, nil, exifData, 0, 0, errThumb
	} else if errWeb != nil {
		log.Println("[ERROR]: Could not encode image.Image back to JPEG (for webImage)", errWeb)
		return nil, nil, exifData, 0, 0, errWeb
	}

	return webImage, thumbImage, exifData, thumbWidth, thumbHeight, nil
}

func extractExif(imageData []byte) (models.Exif, int, error) {
	// <== EXIF Extraction ==>
	// create a empty Exif struct
	exifData := models.Exif{}
	var orientation int

	// create a new Reader for EXIF Extraction from the bucket (ImageData)
	exifImageReader := bytes.NewReader(imageData)

	extractedExif, err := exif.Decode(exifImageReader)
	if err != nil {
		return exifData, 0, err
	} else {
		exifData, orientation = convertExifToModel(extractedExif)
	}

	log.Println("[SUCCESS]: Finished extracting EXIF Data from Image", exifData)

	return exifData, orientation, nil
}

func resizeToWeb(img image.Image) (webImage []byte, err error) {
	var webResized image.Image
	if img.Bounds().Dx() >= img.Bounds().Dy() {
		// landscape resize
		webResized = resize.Resize(1440, 0, img, resize.Lanczos3)
	} else {
		// portrait resize
		webResized = resize.Resize(0, 1440, img, resize.Lanczos3)
	}

	// <- Encode image.Image back to JPEG for storing ->
	webImage, err = encodeImageToJPEG(webResized)
	if err != nil {
		return nil, err
	}

	return webImage, nil
}

func resizeToThumb(img image.Image) (finalThumbImage []byte, thumbWidth int, thumbHeight int, err error) {
	var thumbResized image.Image
	var sharpernedThumbResized image.Image
	if img.Bounds().Dx() > img.Bounds().Dy() {
		// landscape resize
		thumbResized = resize.Resize(640, 0, img, resize.Lanczos3)
		sharpernedThumbResized = imaging.Sharpen(thumbResized, 0.3)
	} else {
		// portrait resize
		thumbResized = resize.Resize(0, 640, img, resize.Lanczos3)
		sharpernedThumbResized = imaging.Sharpen(thumbResized, 0.3)
	}
	thumbWidth = thumbResized.Bounds().Dx()
	thumbHeight = thumbResized.Bounds().Dy()

	finalThumbImage, err = encodeImageToWebP(sharpernedThumbResized)
	if err != nil {
		return nil, 0, 0, err
	}

	return finalThumbImage, thumbWidth, thumbHeight, nil
}

func convertExifToModel(rawExif *exif.Exif) (models.Exif, int) {
	var finalExifData models.Exif
	var orientation int

	// === Extract Aperture ===
	apertureTag, err := rawExif.Get(exif.FNumber)
	if err == nil {
		apertureRat, err := apertureTag.Rat(0)
		if err == nil {
			apertureVal, _ := apertureRat.Float64()
			finalExifData.Aperture = fmt.Sprintf("f/%.1f", apertureVal)
		}
	}

	// === Extract ISO ===
	isoTag, err := rawExif.Get(exif.ISOSpeedRatings)
	if err == nil {
		isoVal, err := isoTag.Int(0)
		if err == nil {
			finalExifData.ISO = fmt.Sprintf("%d", isoVal)
		}
	}

	// === Extract ShutterSpeed
	ssTag, err := rawExif.Get(exif.ExposureTime)
	if err == nil {
		ssRat, err := ssTag.Rat(0)
		if err == nil {
			finalExifData.ShutterSpeed = ssRat.String() + "s"
		}
	}

	// Orientation
	if tag, err := rawExif.Get(exif.Orientation); err == nil {
		if val, err := tag.Int(0); err == nil {
			orientation = val
		}
	}

	return finalExifData, orientation
}

func encodeImageToJPEG(img image.Image) ([]byte, error) {
	// Create a new buffer that we will write the image into
	buf := new(bytes.Buffer)

	// Encode the image stream back into JPEG
	err := jpeg.Encode(buf, img, &jpeg.Options{Quality: 85})
	if err != nil {
		return nil, err
	}

	return buf.Bytes(), nil
}

// use https://github.com/HugoSmits86/nativewebp for encoding to WebP
func encodeImageToWebP(img image.Image) ([]byte, error) {
	buf := new(bytes.Buffer)

	err := nativewebp.Encode(buf, img, nil)
	if err != nil {
		return nil, err
	}

	return buf.Bytes(), nil
}

func applyOrientation(img image.Image, orientation int) image.Image {
	switch orientation {
	case 3:
		return imaging.Rotate180(img)
	case 6:
		return imaging.Rotate270(img)
	case 8:
		return imaging.Rotate90(img)
	default:
		return img
	}
}
