class VideoGenerator {
    constructor() {
        this.frames = [];
        this.currentFrameIndex = 0;
        this.canvas = document.getElementById('currentFrame');
        this.ctx = this.canvas.getContext('2d');
        this.isGenerating = false;
        
        this.initializeCanvas();
        this.bindEvents();
        this.createInitialFrame();
    }

    initializeCanvas() {
        // Set up canvas with pixelated rendering
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.webkitImageSmoothingEnabled = false;
        this.ctx.mozImageSmoothingEnabled = false;
        this.ctx.msImageSmoothingEnabled = false;
        
        // Fill with default background
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    bindEvents() {
        document.getElementById('generateFrame').addEventListener('click', () => this.generateNextFrame());
        document.getElementById('prevFrame').addEventListener('click', () => this.navigateFrame(-1));
        document.getElementById('nextFrame').addEventListener('click', () => this.navigateFrame(1));
        document.getElementById('newProject').addEventListener('click', () => this.newProject());
        document.getElementById('exportFrames').addEventListener('click', () => this.exportFrames());
        
        // Enter key in textarea
        document.getElementById('framePrompt').addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                this.generateNextFrame();
            }
        });
    }

    createInitialFrame() {
        // Create first frame with default content
        const frameData = this.canvas.toDataURL();
        this.frames.push({
            data: frameData,
            prompt: "Initial frame"
        });
        this.updateTimeline();
        this.updateUI();
    }

    async generateNextFrame() {
        if (this.isGenerating) return;
        
        const prompt = document.getElementById('framePrompt').value.trim();
        if (!prompt) {
            alert('Please describe what should happen in the next frame!');
            return;
        }

        this.isGenerating = true;
        this.showLoading(true);

        try {
            // Get current frame as base64
            const currentFrameData = this.canvas.toDataURL();
            
            // Create 8-bit style prompt
            const fullPrompt = `8-bit pixel art game frame: ${prompt}. Keep the same art style, low resolution, limited color palette, retro video game aesthetic. ${document.getElementById('keepBackground').checked ? 'Maintain background elements from previous frame.' : ''}`;
            
            // Generate next frame using AI
            const result = await websim.imageGen({
                prompt: fullPrompt,
                width: 320,
                height: 240,
                image_inputs: [{
                    url: currentFrameData
                }]
            });

            // Create new frame
            await this.loadImageToCanvas(result.url);
            
            // Add to frames array
            const newFrameData = this.canvas.toDataURL();
            this.frames.push({
                data: newFrameData,
                prompt: prompt
            });

            // Update UI
            this.currentFrameIndex = this.frames.length - 1;
            this.updateTimeline();
            this.updateUI();
            
            // Clear prompt for next frame
            document.getElementById('framePrompt').value = '';
            
        } catch (error) {
            console.error('Error generating frame:', error);
            alert('Failed to generate frame. Please try again.');
        } finally {
            this.isGenerating = false;
            this.showLoading(false);
        }
    }

    async loadImageToCanvas(imageUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
                resolve();
            };
            img.onerror = reject;
            img.src = imageUrl;
        });
    }

    navigateFrame(direction) {
        const newIndex = this.currentFrameIndex + direction;
        if (newIndex >= 0 && newIndex < this.frames.length) {
            this.currentFrameIndex = newIndex;
            this.displayFrame(this.currentFrameIndex);
            this.updateUI();
        }
    }

    displayFrame(index) {
        if (this.frames[index]) {
            const img = new Image();
            img.onload = () => {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this.ctx.drawImage(img, 0, 0);
            };
            img.src = this.frames[index].data;
        }
    }

    updateTimeline() {
        const timeline = document.getElementById('timelineFrames');
        timeline.innerHTML = '';

        this.frames.forEach((frame, index) => {
            const frameElement = document.createElement('div');
            frameElement.className = `timeline-frame ${index === this.currentFrameIndex ? 'active' : ''}`;
            frameElement.dataset.frame = index;
            
            const thumb = document.createElement('div');
            thumb.className = 'frame-thumb';
            thumb.style.backgroundImage = `url(${frame.data})`;
            thumb.style.backgroundSize = 'cover';
            thumb.style.backgroundPosition = 'center';
            
            const label = document.createElement('span');
            label.textContent = index + 1;
            
            frameElement.appendChild(thumb);
            frameElement.appendChild(label);
            
            frameElement.addEventListener('click', () => {
                this.currentFrameIndex = index;
                this.displayFrame(index);
                this.updateUI();
            });
            
            timeline.appendChild(frameElement);
        });
    }

    updateUI() {
        // Update frame counter
        document.getElementById('frameCounter').textContent = 
            `Frame: ${this.currentFrameIndex + 1} / ${this.frames.length}`;
        
        // Update navigation buttons
        document.getElementById('prevFrame').disabled = this.currentFrameIndex <= 0;
        document.getElementById('nextFrame').disabled = this.currentFrameIndex >= this.frames.length - 1;
        
        // Update timeline active state
        document.querySelectorAll('.timeline-frame').forEach((el, index) => {
            el.classList.toggle('active', index === this.currentFrameIndex);
        });
        
        // Update generate button
        const generateBtn = document.getElementById('generateFrame');
        generateBtn.disabled = this.isGenerating;
    }

    showLoading(show) {
        const loadingIcon = document.getElementById('loadingIcon');
        const btnText = document.querySelector('.btn-text');
        
        if (show) {
            loadingIcon.style.display = 'block';
            btnText.style.opacity = '0';
        } else {
            loadingIcon.style.display = 'none';
            btnText.style.opacity = '1';
        }
    }

    newProject() {
        if (this.frames.length > 1) {
            if (!confirm('Are you sure you want to start a new project? All current frames will be lost.')) {
                return;
            }
        }
        
        this.frames = [];
        this.currentFrameIndex = 0;
        this.initializeCanvas();
        this.createInitialFrame();
        document.getElementById('framePrompt').value = '';
    }

    async exportFrames() {
        if (this.frames.length === 0) {
            alert('No frames to export!');
            return;
        }

        // Create a simple GIF-like preview by cycling through frames
        let currentFrame = 0;
        const interval = setInterval(() => {
            this.displayFrame(currentFrame);
            currentFrame = (currentFrame + 1) % this.frames.length;
        }, 500);

        setTimeout(() => {
            clearInterval(interval);
            this.displayFrame(this.currentFrameIndex);
            
            // In a real implementation, you might want to:
            // - Export as individual PNG files
            // - Create an actual GIF/video
            // - Upload to a service
            alert(`Animation preview complete! Your project has ${this.frames.length} frames.`);
        }, this.frames.length * 500 + 2000);
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new VideoGenerator();
});

