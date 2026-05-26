from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
from yolov4 import detect_cars
from algo import optimize_traffic
from multiprocessing import Pool, Manager
import time

app = Flask(__name__)
CORS(app)

processing_status = {
    'status': 'idle',
    'message': 'Waiting for upload...',
    'processed': 0,
    'total': 4,
    'counts': [],
    'optimization': None,
    'current': None,
    'error': None,
    'max_cars': 0,
}

def detect_and_return(video_index, video_path, shared_counts):
    """Detect cars in a video."""
    def callback(count):
        shared_counts[video_index] = count
    return detect_cars(video_path, progress_callback=callback)

@app.route('/upload', methods=['POST'])
def upload_files():
    files = request.files.getlist('videos')
    if len(files) < 1 or len(files) > 4:
        processing_status.update({
            'status': 'error',
            'message': 'Upload failed: upload between 1 and 4 videos.',
            'error': 'Please upload between 1 and 4 videos',
        })
        return jsonify({'error': 'Please upload between 1 and 4 videos'}), 400

    video_paths = []
    for i, file in enumerate(files):
        video_path = os.path.join('uploads', f'video_{i}.mp4')
        file.save(video_path)
        video_paths.append(video_path)

    processing_status.update({
        'status': 'processing',
        'message': f'Scanning all {len(files)} videos in parallel...',
        'processed': 0,
        'total': len(files),
        'counts': [0] * len(files),
        'optimization': None,
        'current': f'Processing videos 0/{len(files)} completed',
        'error': None,
        'max_cars': 0,
    })

    num_cars_list = [0] * len(files)
    
    try:
        manager = Manager()
        shared_counts = manager.dict()
        
        with Pool(4) as pool:
            # Submit all videos at once using apply_async
            results = [
                pool.apply_async(detect_and_return, (i, video_file, shared_counts))
                for i, video_file in enumerate(video_paths)
            ]
            
            completed = [False] * len(results)
            done_count = 0
            
            while done_count < len(results):
                processing_status.update({
                    'processed': done_count,
                    'counts': [shared_counts.get(i, 0) for i in range(len(files))],
                    'current': f'Processing videos {done_count}/{len(files)} completed',
                    'max_cars': max(shared_counts.values()) if shared_counts else 0,
                })
                
                # Check which results are done
                for i, result in enumerate(results):
                    if not completed[i] and result.ready():
                        try:
                            car_count = result.get(timeout=0)
                            num_cars_list[i] = car_count
                            # shared_counts[i] = car_count  # already set by callback
                            completed[i] = True
                            done_count += 1
                        except Exception as e:
                            print(f"Error processing video {i}: {e}")
                            processing_status.update({
                                'status': 'error',
                                'error': f'Error processing video: {str(e)}',
                                'message': 'Processing failed',
                            })
                            return jsonify({'error': f'Error processing video: {str(e)}'}), 500
                
                time.sleep(0.5)  # Poll every 500ms

        print(f"Processing complete. vehicle counts: {num_cars_list}")
        # Pad to 4 directions if less
        while len(num_cars_list) < 4:
            num_cars_list.append(0)
        result = optimize_traffic(num_cars_list)
        print(f"Optimization result: {result}")
        
        processing_status.update({
            'status': 'done',
            'message': 'All videos processed successfully.',
            'optimization': result,
            'counts': list(num_cars_list),
            'current': None,
            'processed': len(files),
            'total': len(files),
            'max_cars': max(num_cars_list) if num_cars_list else 0,
        })

        return jsonify({'counts': num_cars_list, 'optimization': result})
    
    except Exception as e:
        print(f"Processing error: {e}")
        import traceback
        traceback.print_exc()
        processing_status.update({
            'status': 'error',
            'error': str(e),
            'message': 'Processing failed',
        })
        return jsonify({'error': str(e)}), 500


@app.route('/status', methods=['GET'])
def status():
    return jsonify(processing_status)

@app.route('/videos/<filename>')
def get_video(filename):
    return send_from_directory('uploads', filename)

if __name__ == '__main__':
    if not os.path.exists('uploads'):
        os.makedirs('uploads')
    app.run(debug=False)
