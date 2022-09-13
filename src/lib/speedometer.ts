const SAMPLE_PERIOD = 30 * 1000; // Remember the last 30 seconds.
const MIN_SAMPLES = 5;
const MAX_SAMPLES = 1024;

export class Speedometer {
  startTime: number = Date.now();
  timeStamps: number[] = [];
  timeStampN: number[] = [];
  allTimeWork = 0;

  didWork(n = 1) {
    this.timeStamps.push(Date.now());
    this.timeStampN.push(n);
    this.allTimeWork += n;

    if (this.timeStamps.length === MAX_SAMPLES) {
      // Combine adjacent timestamps.
      for (let i = 0; i < this.timeStamps.length; i += 2) {
        const work = this.timeStampN[i] + this.timeStampN[i + 1];
        const time = this.timeStamps[i];
        this.timeStampN[i / 2] = work;
        this.timeStamps[i / 2] = time;
      }
      this.timeStamps.length = MAX_SAMPLES / 2;
      this.timeStampN.length = MAX_SAMPLES / 2;
    }

    const now = Date.now();
    while (
      this.timeStamps.length > MIN_SAMPLES
      && now - this.timeStamps[0] > SAMPLE_PERIOD) {
      // Remove extraneous items.
      this.timeStamps.shift();
      this.timeStampN.shift();
    }
  }

  /**
   * Gets the work per second for the last SAMPLE_PERIOD
   */
  workPerSecond() {
    if (this.timeStamps.length < MIN_SAMPLES) {
      return 0;
    }
    const delta = (Date.now() - this.timeStamps[0]) / 1000;
    const work = this.timeStampN.reduce((a, b) => a + b, 0);
    return work / delta;
  }

  /**
   * Gets the work per second since the speedometer was created.
   */
  allTimeWorkPerSecond() {
    const delta = (Date.now() - this.startTime) / 1000;
    return this.allTimeWork / delta;
  }

  /**
   * Gets the estimated time to completion of totalWork, in seconds.
   */
  timeToCompletion(totalWork: number) {
    const needToDo = totalWork - this.allTimeWork;
    const currentRate = this.workPerSecond();
    return needToDo / currentRate;
  }
}

export function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  } else if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
  } else {
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m ${Math.floor(seconds % 60)}s`;
  }
}