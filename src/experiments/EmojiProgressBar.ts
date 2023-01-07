import { Message } from 'eris';
import { SlashCreator } from 'slash-create';

export type ShouldProgressPredicate = (lastAdvancement: number) => boolean;

export default class EmojiProgressBar {
  threshold = 2000;
  interval = 1000;
  progress = 0;
  progressMax = 100;
  width = 5;
  characters = {
    any: {
      empty: ':red_square:',
      current: ':green_square:',
      full: ':blue_square:'
    },
    start: [':white_large_square:', ':purple_square:', ':brown_square:'],
    mid: [':red_square:', ':orange_square:', ':yellow_square:'],
    end: [':white_large_square:', ':blue_square:', ':black_large_square:']
  };
  lastAdvance: number;

  get currentCharDict() {
    if (this.completeWidth <= 1) return this.characters.start;
    if (this.completeWidth >= this.width) return this.characters.end;
    return this.characters.mid;
  }

  get completePercentage() {
    return this.progress / this.progressMax;
  }

  constructor(public creator: SlashCreator) {}

  shouldAdvance: ShouldProgressPredicate = (ms) => ms >= this.threshold || Math.random() > 0.5;

  async run(origin: Message, shouldProgress = this.shouldAdvance) {
    if (this.lastAdvance) return;

    const msg = await origin.channel.createMessage('progress starting');

    this.lastAdvance = Date.now();

    const ref = setInterval(async () => {
      if (shouldProgress(this.lastAdvance)) {
        this.lastAdvance = Date.now();
        this.progress++;
      }

      console.log(this.progress, this.completeWidth, this.completePercentage * this.currentCharDict.length);

      await msg.edit({
        content: this.buildProgressBar()
      });

      if (this.progress >= this.progressMax) {
        clearTimeout(ref);
        this.lastAdvance = null;
      }
    }, this.interval);
  }

  private get completeWidth() {
    return Math.round(this.completePercentage * this.width);
  }

  private buildProgressBar = (): string =>
    [
      ...(this.completeWidth > Math.ceil(this.completePercentage * this.characters.start.length)
        ? [this.characters.start[2], this.characters.mid[2].repeat(Math.max(0, this.completeWidth - 1))]
        : []),
      this.currentCharDict[Math.round(this.completePercentage * this.currentCharDict.length)],
      ...(this.width - this.completeWidth
        ? [this.characters.mid[0].repeat(Math.max(0, this.width - this.completeWidth - 1)), this.characters.end[0]]
        : [])
    ].join('');
}
