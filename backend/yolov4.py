import os
import cv2 as cv
import time
import numpy as np
from scipy.signal import find_peaks

def detect_cars(video_file, progress_callback=None):
    # Resolve YOLO model/labels relative to this file so multiprocessing workers
    # (which may have a different working directory) can still load them.
    base_dir = os.path.dirname(os.path.abspath(__file__))
    classes_path = os.path.join(base_dir, "classes.txt")
    cfg_path = os.path.join(base_dir, "yolov4-tiny.cfg")
    weights_path = os.path.join(base_dir, "yolov4-tiny.weights")

    # Set thresholds
    Conf_threshold = 0.4
    NMS_threshold = 0.4

    # Define colors for different classes
    COLORS = [(0, 255, 0), (0, 0, 255), (255, 0, 0), 
              (255, 255, 0), (255, 0, 255), (0, 255, 255)]

    # Load class names from file
    class_name = []
    with open(classes_path, 'r') as f:
        class_name = [cname.strip() for cname in f.readlines()]

    # Load the network
    net = cv.dnn.readNet(weights_path, cfg_path)

    # Set preferable backend and target (use CPU for compatibility)
    net.setPreferableBackend(cv.dnn.DNN_BACKEND_DEFAULT)
    net.setPreferableTarget(cv.dnn.DNN_TARGET_CPU)

    # Initialize the detection model
    model = cv.dnn_DetectionModel(net)
    model.setInputParams(size=(416, 416), scale=1/255, swapRB=True)

    # Open the video file
    cap = cv.VideoCapture(video_file)
    starting_time = time.time()
    frame_counter = 0

    # Try to create GUI window, fallback to headless if not supported
    try:
        cv.namedWindow('frame', cv.WINDOW_NORMAL)
        cv.setWindowProperty('frame', cv.WND_PROP_FULLSCREEN, cv.WINDOW_FULLSCREEN)
        gui_available = True
    except:
        gui_available = False
        print("GUI not available, running in headless mode")

    # To keep track of car counts per frame
    car_counts = []  # Store individual frame car counts
    max_cars_detected = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame_counter += 1

        # Perform detection
        classes, scores, boxes = model.detect(frame, Conf_threshold, NMS_threshold)

        # Count the number of cars detected in this frame
        frame_car_count = 0
        for (classid, score, box) in zip(classes, scores, boxes):
            if class_name[classid] == "car":  # assuming 'car' is the class name for cars in your classes.txt
                frame_car_count += 1
                color = COLORS[int(classid) % len(COLORS)]
                label = f"{class_name[classid]} : {score:.2f}"
                cv.rectangle(frame, box, color, 2)
                cv.putText(frame, label, (box[0], box[1]-10), 
                           cv.FONT_HERSHEY_COMPLEX, 0.5, color, 2)

        car_counts.append(frame_car_count)
        max_cars_detected = max(max_cars_detected, frame_car_count)

        # Send live progress updates every few frames
        if progress_callback and frame_counter % 5 == 0:
            try:
                progress_callback(max_cars_detected)
            except Exception as e:
                print("Progress callback error:", e)

        # Calculate average car count in recent frames for statistics
        recent_frames = car_counts[-30:] if len(car_counts) > 30 else car_counts
        avg_car_count = np.mean(recent_frames) if recent_frames else 0

        # Calculate and display FPS
        ending_time = time.time()
        fps = frame_counter / (ending_time - starting_time)
        cv.putText(frame, f'FPS: {fps:.2f}', (20, 50), 
                   cv.FONT_HERSHEY_COMPLEX, 0.7, (0, 255, 0), 2)
        
        # Display the maximum car count detected on the frame
        cv.putText(frame, f'Max Cars Detected : {max_cars_detected} | Avg : {avg_car_count:.1f}', (20, 80), 
                   cv.FONT_HERSHEY_COMPLEX, 0.7, (0, 255, 255), 2)

        # Display the frame if GUI is available
        if gui_available:
            cv.imshow('frame', frame)
            key = cv.waitKey(1)
            if key == ord('q'):
                break

    # Release the video capture and close windows if GUI was available
    cap.release()
    if gui_available:
        cv.destroyAllWindows()

    # Return the maximum number of cars detected in any single frame
    return int(max_cars_detected)

# Usage example:
#mean_peak_value = detect_cars('output.avi')
#print(f'Mean Peak Number of Cars Detected: {mean_peak_value}')