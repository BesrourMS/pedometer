class BarometerEnhancedStepCounter {
  constructor(options = {}) {
    this.options = {
      height: 170, // in cm
      gyroThreshold: 1.5,
      accThreshold: 1.2,
      timeThreshold: 250,
      pressureThreshold: 0.1, // hPa, adjust based on testing
      ...options
    };
    this.steps = 0;
    this.distance = 0; // in meters
    this.elevationGain = 0; // in meters
    this.lastGyroMagnitude = 0;
    this.lastAccMagnitude = 0;
    this.lastPressure = null;
    this.isStepUp = false;
    this.lastStepTime = 0;
    this.gyroBuffer = [];
    this.accBuffer = [];
    this.pressureBuffer = [];
    this.bufferSize = 10;
    
    this.updateHeightRelatedParams();
  }

  updateHeightRelatedParams() {
    // ... (same as before)
  }

  start() {
    if (window.DeviceMotionEvent) {
      window.addEventListener('devicemotion', this.handleMotion.bind(this));
    } else {
      console.error('Device motion not supported');
    }
  }

  stop() {
    window.removeEventListener('devicemotion', this.handleMotion.bind(this));
  }

  handleMotion(event) {
    const { x: gx, y: gy, z: gz } = event.rotationRate || {};
    const { x: ax, y: ay, z: az } = event.acceleration || {};
    const { x: agx, y: agy, z: agz } = event.accelerationIncludingGravity || {};
    
    if (!gx || !ax || !agx) return; // Ensure all required data is available

    const gyroMagnitude = Math.sqrt(gx*gx + gy*gy + gz*gz);
    const accMagnitude = Math.sqrt(ax*ax + ay*ay + az*az);
    
    // Estimate pressure change from accelerationIncludingGravity
    const pressure = this.estimatePressure(agx, agy, agz);

    // Update buffers
    this.updateBuffer(this.gyroBuffer, gyroMagnitude);
    this.updateBuffer(this.accBuffer, accMagnitude);
    this.updateBuffer(this.pressureBuffer, pressure);

    // Apply low-pass filter
    const filteredGyro = this.lowPassFilter(this.gyroBuffer);
    const filteredAcc = this.lowPassFilter(this.accBuffer);
    const filteredPressure = this.lowPassFilter(this.pressureBuffer);

    const now = Date.now();
    const timeSinceLastStep = now - this.lastStepTime;

    if (this.isValidStep(filteredGyro, filteredAcc, filteredPressure, timeSinceLastStep)) {
      this.steps++;
      this.distance += this.stepLength;
      this.updateElevation(filteredPressure);
      this.lastStepTime = now;
      console.log(`Steps: ${this.steps}, Distance: ${this.distance.toFixed(2)}m, Elevation Gain: ${this.elevationGain.toFixed(2)}m`);
    }

    this.lastGyroMagnitude = filteredGyro;
    this.lastAccMagnitude = filteredAcc;
    this.lastPressure = filteredPressure;
  }

  estimatePressure(agx, agy, agz) {
    // This is a very rough estimate and would need calibration
    const g = 9.81; // Earth's gravity in m/s^2
    const pressureAtSeaLevel = 1013.25; // hPa
    const heightChange = (Math.sqrt(agx*agx + agy*agy + agz*agz) - g) / g * 8.43;
    return pressureAtSeaLevel * Math.exp(-heightChange / 7000);
  }

  updateElevation(currentPressure) {
    if (this.lastPressure !== null) {
      const pressureChange = currentPressure - this.lastPressure;
      if (Math.abs(pressureChange) > this.options.pressureThreshold) {
        // Rough estimate: -1 hPa ≈ 8.43m elevation at sea level
        const elevationChange = pressureChange * -8.43;
        if (elevationChange > 0) {
          this.elevationGain += elevationChange;
        }
      }
    }
  }

  isValidStep(gyroMagnitude, accMagnitude, pressure, timeSinceLastStep) {
    // ... (previous checks)
    
    const pressureChange = this.lastPressure !== null ? Math.abs(pressure - this.lastPressure) : 0;
    const isPressureChangeSignificant = pressureChange > this.options.pressureThreshold;

    // Include pressure change in step validation
    if (isGyroOverThreshold && isAccOverThreshold && !this.isStepUp && 
        isTimeThresholdMet && isCadenceReasonable && isPressureChangeSignificant) {
      this.isStepUp = true;
      return true;
    } else if (gyroMagnitude < this.options.gyroThreshold && this.isStepUp) {
      this.isStepUp = false;
    }

    return false;
  }

  // ... (other methods remain the same)

  getElevationGain() {
    return this.elevationGain;
  }
}

// Usage
const stepCounter = new BarometerEnhancedStepCounter({
  height: 180, // User's height in cm
  gyroThreshold: 1.8,
  accThreshold: 1.4,
  timeThreshold: 300,
  pressureThreshold: 0.15
});

// Request permission for motion sensors (required in modern browsers)
if (typeof DeviceMotionEvent.requestPermission === 'function') {
  DeviceMotionEvent.requestPermission()
    .then(permissionState => {
      if (permissionState === 'granted') {
        stepCounter.start();
      } else {
        console.error('Permission to access motion sensors was denied');
      }
    })
    .catch(console.error);
} else {
  // Handle regular non-iOS 13+ devices
  stepCounter.start();
}

// To get the current stats
// console.log(`Steps: ${stepCounter.getSteps()}, Distance: ${stepCounter.getDistance().toFixed(2)}m, Elevation Gain: ${stepCounter.getElevationGain().toFixed(2)}m`);
