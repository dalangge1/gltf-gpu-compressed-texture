/**
 * @author Deepkolos / https://github.com/deepkolos
 */

export class WorkerPool {
  pool: number;
  quene: Array<{
    resolve: (e: any) => void;
    msg: any;
    transfer: Array<Transferable>;
  }>;
  workers: Array<Worker>;
  workersResolve: Array<(e: any) => void>;
  workerStatus: number;
  constructor(pool = 4) {
    this.pool = pool;
    this.quene = [];
    this.workers = [];
    this.workersResolve = [];
    this.workerStatus = 0;
  }

  _initWorker(workerId: number) {
    if (!this.workers[workerId]) {
      const worker = this.workerCreator();
      worker.addEventListener('message', this._onMessage.bind(this, workerId));
      this.workers[workerId] = worker;
    }
  }
  workerCreator(): Worker {
    throw new Error('Method not implemented.');
  }

  _getIdleWorker() {
    for (let i = 0; i < this.pool; i++)
      if (!(this.workerStatus & (1 << i))) return i;

    return -1;
  }

  _onMessage(workerId: number, msg: any) {
    const resolve = this.workersResolve[workerId];
    resolve && resolve(msg);

    if (this.quene.length) {
      const { resolve, msg, transfer } = this.quene.shift();
      this.workersResolve[workerId] = resolve;
      this.workers[workerId].postMessage(msg, transfer);
    } else {
      this.workerStatus ^= 1 << workerId;
    }
  }

  setWorkerCreator(workerCreator: () => Worker) {
    this.workerCreator = workerCreator;
  }

  setWorkerLimit(pool: number) {
    this.pool = pool;
  }

  postMessage(msg: any, transfer?: Array<Transferable>): Promise<MessageEvent> {
    return new Promise(resolve => {
      const workerId = this._getIdleWorker();

      if (workerId !== -1) {
        this._initWorker(workerId);
        this.workerStatus |= 1 << workerId;
        this.workersResolve[workerId] = resolve;
        this.workers[workerId].postMessage(msg, transfer);
      } else {
        this.quene.push({ resolve, msg, transfer });
      }
    });
  }

  dispose() {
    this.workers.forEach(worker => worker.terminate());
    this.workersResolve.length = 0;
    this.workers.length = 0;
    this.quene.length = 0;
    this.workerStatus = 0;
  }
}
