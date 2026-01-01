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

	"github.com/nfnt/resize"
	"github.com/rwcarlsen/goexif/exif"
	"github.com/rwcarlsen/goexif/mknote"
)

func ProcessImage(file io.Reader) (webImage []byte, thumbImage []byte, exifData models.Exif, err error) {

	const MaxTotalPixelCount = 8000 * 8000 // Image width * Image height

	// Copy the image byte stream into a bucket so that it can be reused
	imageData, err := io.ReadAll(file)
	if err != nil {
		log.Println("[ERROR]: Could not dump Image Stream into Byte Slice", err)
		return nil, nil, models.Exif{}, err
	}

	// <== Check Dimensions of Image ==>
	decodeConfigReader := bytes.NewReader(imageData)
	imageConfig, _, err := image.DecodeConfig(decodeConfigReader)
	if err != nil {
		log.Println("[ERROR]: DecodeConfig failed to extract dimensions of the image")
		return nil, nil, models.Exif{}, err
	} else if (imageConfig.Width * imageConfig.Height) > MaxTotalPixelCount {
		log.Println("[ERROR]: Image Dimensions are bigger than allowed dimensions")
		ErrImageTooLarge := errors.New("Provided image exceeds the maximum dimensions")
		return nil, nil, models.Exif{}, ErrImageTooLarge
	}

	// <== EXIF Extraction ==>
	// create a new Reader for EXIF Extraction from the bucket (ImageData)
	exifImageReader := bytes.NewReader(imageData)

	exif.RegisterParsers(mknote.All...)

	extractedExif, err := exif.Decode(exifImageReader)
	if err != nil {
		log.Println("[WARNING]: No EXIF data found or decode error: ", err)
		exifData = models.Exif{}
	} else {
		exifData = convertExifToModel(extractedExif)
	}

	log.Println("[SUCCESS]: Finished extracting EXIF Data from Image", exifData)

	// <== Resize Image ==>
	// again create a new Reader for Resizing from the bucket (ImageData)
	resizeImageReader := bytes.NewReader(imageData)

	// Convert byte stream into image.Image object for manipulation
	img, _, err := image.Decode(resizeImageReader)
	if err != nil {
		log.Println("[ERROR]: Could not decode Image to image.Image", err)
		return nil, nil, exifData, err
	}

	// resize the images to 400px and 1920px
	webResized := resize.Resize(1920, 0, img, resize.Lanczos3)
	thumbResized := resize.Resize(400, 0, img, resize.Lanczos3)

	// <- Encode image.Image back to JPEG for storing ->
	webImage, err = encodeImageToJPEG(webResized)
	if err != nil {
		log.Println("[ERROR]: Could not encode image.Image back to JPEG (for webImage)", err)
		return nil, nil, exifData, err
	}
	thumbImage, err = encodeImageToJPEG(thumbResized)
	if err != nil {
		log.Println("[ERROR]: Could not encode image.Image back to JPEG (for thumbImage)", err)
		return nil, nil, exifData, err
	}

	return webImage, thumbImage, exifData, nil
}

func convertExifToModel(rawExif *exif.Exif) models.Exif {
	var finalExifData models.Exif

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

	return finalExifData
}

func encodeImageToJPEG(img image.Image) ([]byte, error) {
	// Create a new buffer that we will write the image into
	buf := new(bytes.Buffer)

	// Encode the image stream back into JPEG
	err := jpeg.Encode(buf, img, &jpeg.Options{Quality: 85})
	if err != nil {
		return nil, err
	}

	// fill comment here according to my question
	return buf.Bytes(), nil
}
