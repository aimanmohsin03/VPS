import cv2
import numpy as np
import os

def preprocess_image(image_path, output_dir):
    # Load the image
    image = cv2.imread(image_path)
    if image is None:
        print("Error: Unable to load image.")
        return
    
    # Resize the image to 640x480
    resized_image = cv2.resize(image, (640, 480))
    
    # Convert to grayscale
    grayscale_image = cv2.cvtColor(resized_image, cv2.COLOR_BGR2GRAY)
    
    # Apply Gaussian blur for noise reduction
    noise_reduced_image = cv2.GaussianBlur(grayscale_image, (5, 5), 0)
    
    # Apply Canny edge detection
    edges = cv2.Canny(noise_reduced_image, 50, 150)
    
    # Display images
    cv2.imshow('Original Image', resized_image)
    cv2.imshow('Grayscale Image', grayscale_image)
    cv2.imshow('Noise Reduced Image', noise_reduced_image)
    cv2.imshow('Edge Detected Image', edges)
    cv2.waitKey(0)
    cv2.destroyAllWindows()
    
    # Save processed images
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    cv2.imwrite(os.path.join(output_dir, 'original_resized.jpg'), resized_image)
    cv2.imwrite(os.path.join(output_dir, 'grayscale_image.jpg'), grayscale_image)
    cv2.imwrite(os.path.join(output_dir, 'noise_reduced_image.jpg'), noise_reduced_image)
    cv2.imwrite(os.path.join(output_dir, 'edge_detected_image.jpg'), edges)
    
    print("Processed images saved successfully in", output_dir)

# Example usage
image_path = 'student.jpg'  # Replace with your actual image path
output_dir = '/Users/aimanmohsin/Desktop'
preprocess_image(image_path, output_dir)
