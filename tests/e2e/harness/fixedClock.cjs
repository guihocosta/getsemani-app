// Preload do servidor de teste: desloca o relogio para E2E_NOW sem congelar.
// As telas dependem de "hoje" no servidor, e sem isso o baseline venceria.
const RealDate = Date;
const offset = RealDate.parse(process.env.E2E_NOW) - RealDate.now();

class ShiftedDate extends RealDate {
  constructor(...args) {
    if (args.length === 0) super(RealDate.now() + offset);
    else super(...args);
  }
  static now() {
    return RealDate.now() + offset;
  }
  // O Next copia os estaticos proprios de Date; herdados nao bastam.
  static parse(s) {
    return RealDate.parse(s);
  }
  static UTC(...args) {
    return RealDate.UTC(...args);
  }
}

globalThis.Date = ShiftedDate;
