// process the high-resolution image -> resize it, extract data and optimize it
package services

import (
	"bytes"
	"errors"
	"image"
	"io"
	"log"
	"sync"

	"github.com/HugoSmits86/nativewebp"
	"github.com/disintegration/imaging"
	"github.com/nfnt/resize"
)

func ProcessImage(file io.Reader, imageOrientation int) (webImage []byte, thumbImage []byte, thumbWidth int, thumbHeight int, err error) {

	const MaxTotalPixelCount = 8000 * 8000 // Image width * Image height
	var errThumb error = nil

	// Copy the image byte stream into a bucket so that it can be reused
	imageData, err := io.ReadAll(file)
	if err != nil {
		log.Println("[ERROR]: Could not dump Image Stream into Byte Slice", err)
		return nil, nil, 0, 0, err
	}

	// <== Check Dimensions of Image & assign isPortrait value ==>
	decodeConfigReader := bytes.NewReader(imageData)
	imageConfig, _, err := image.DecodeConfig(decodeConfigReader)
	if err != nil {
		log.Println("[ERROR]: DecodeConfig failed to extract dimensions of the image")
		return nil, nil, 0, 0, err
	} else if (imageConfig.Width * imageConfig.Height) > MaxTotalPixelCount {
		log.Println("[ERROR]: Image Dimensions are bigger than allowed dimensions")
		ErrImageTooLarge := errors.New("Provided image exceeds the maximum dimensions")
		return nil, nil, 0, 0, ErrImageTooLarge
	}

	var wg sync.WaitGroup

	// again create a new Reader for Resizing from the bucket (ImageData)
	resizeImageReader := bytes.NewReader(imageData)

	// Convert byte stream into image.Image object for manipulation
	img, _, err := image.Decode(resizeImageReader)
	if err != nil {
		log.Println("[ERROR]: Could not decode Image to image.Image", err)
		return nil, nil, 0, 0, err
	}

	rotatedImg := applyOrientation(img, imageOrientation)

	wg.Go(func() {
		thumbImage, thumbWidth, thumbHeight, errThumb = resizeToThumb(rotatedImg)
	})

	wg.Wait()

	if errThumb != nil {
		log.Println("[ERROR]: Could not encode image.Image back to JPEG (for thumbImage)", errThumb)
		return nil, nil, 0, 0, errThumb
	}

	return imageData, thumbImage, thumbWidth, thumbHeight, nil
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
