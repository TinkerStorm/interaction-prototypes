import EventEmitter from 'events';
import { IGame } from '../util/types';

const gradient = 2.2;
const offset = 8.1;

export class BallotInstance extends EventEmitter {
  startedAt = Date.now();

  constructor(public game: IGame, public durationMs: number) {
    super({
      captureRejections: false
    });
  }

  get remainingPlayerCount() {
    return 8;
    // return this.game.players.filter(player => player.alive).length
  }

  get totalPlayerCount() {
    return this.game.players.length; // max at 25... because of component limits
  }

  // https://www.desmos.com/calculator/4alamggh46
  get duration() {
    return Math.round((this.totalPlayerCount / this.remainingPlayerCount) * gradient + offset)
  }

  get remaniningTime() {
    return this.startedAt + this.durationMs - Date.now();
  }

  waitFor(event: string | symbol, timeout?: number) {
    const start = Date.now();

    return new Promise((resolve, reject) => {
      const listener = () => {
        if (ref) clearTimeout(ref);
        resolve(Date.now() - start);
      };

      this.once(event, listener);

      if (!timeout) return;

      const ref = setTimeout(() => {
        this.off(event, listener);
        reject(Date.now() - start);
      }, timeout);
    });
  }
}
