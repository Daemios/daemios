export default class Encounter {
  public isActive: boolean;
  public startedAt: Date;
  public endedAt: Date | null;

  constructor() {
    this.isActive = true;
    this.startedAt = new Date();
    this.endedAt = null;
  }

  public end(): void {
    this.isActive = false;
    this.endedAt = new Date();
  }
}
