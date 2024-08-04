class Pedometer {
  constructor(height) {
    this.height = height;
    this.steps = 0;
    this.distance = 0;
    this.speed = 0;
    this.calories = 0;
    this.accelerationHistory = new CircularBuffer(5000);
    this.lastPosition = null;
    this.totalDistance = 0;
    this.distanceThreshold = 1;
    this.stepThreshold = 2.8;
    this.stepSensitivity = 0.1;
  }

  detectSteps(accelData) {
    this.accelerationHistory.push(accelData);
    const filteredData = this.filterData(this.accelerationHistory);
    const stepDetected = this.detectStep(filteredData);
    if (stepDetected) {
      this.steps++;
      this.updateMetrics();
    }
  }

  filterData(data) {
    // Use a more advanced filter, such as a Kalman filter or a low-pass filter
    return data.map((value) => value * 0.1 + (1 - 0.1) * this.filterData(data.shift()));
  }

  detectStep(data) {
    // Use a more sophisticated step detection algorithm, such as a machine learning-based approach or a peak detection algorithm
    return data > this.stepThreshold && data - this.accelerationHistory.get(-1) > this.stepSensitivity;
  }

  updateMetrics() {
    const stepsPer2s = this.steps / (2 * this.dataRate);
    let stride;

    if (stepsPer2s >= 8) {
      stride = 1.2 * this.height;
    } else if (stepsPer2s >= 6) {
      stride = this.height;
    } else if (stepsPer2s >= 5) {
      stride = this.height / 1.2;
    } else if (stepsPer2s >= 4) {
      stride = this.height / 2;
    } else if (stepsPer2s >= 3) {
      stride = this.height / 3;
    } else if (stepsPer2s >= 2) {
      stride = this.height / 4;
    } else {
      stride = this.height / 5;
    }

    this.distance = this.steps * stride;
    this.speed = (this.steps * stride) / (2 * this.dataRate);
    this.calories = this.calculateCalories(this.speed);
  }

  calculateCalories(speed) {
    return speed * 0.1;
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    // Use a more accurate distance calculation algorithm, such as the Vincenty formula
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}

class CircularBuffer {
  constructor(size) {
    this.size = size;
    this.data = new Array(size);
    this.index = 0;
  }

  push(value) {
    this.data[this.index] = value;
    this.index = (this.index + 1) % this.size;
  }

  get(index) {
    return this.data[(this.index + index) % this.size];
  }
}
