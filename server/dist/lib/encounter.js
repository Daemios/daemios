class Encounter {
    constructor() {
        this.isActive = true;
        this.startedAt = new Date();
        this.endedAt = null;
    }
    end() {
        this.isActive = false;
        this.endedAt = new Date();
    }
}
export default Encounter;
