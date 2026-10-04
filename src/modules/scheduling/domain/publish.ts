// Item do menu da ocorrencia que alterna rascunho/publicada: sempre oferece o
// estado oposto ao atual. So tornar rascunho pede confirmacao (tira a data do ar).
export function publishMenuItem(published: boolean): {
  label: string;
  target: boolean;
  confirm: string | null;
} {
  return published
    ? {
        label: "Tornar rascunho",
        target: false,
        confirm: "Voluntários deixam de ver esta data até você publicar de novo.",
      }
    : { label: "Publicar", target: true, confirm: null };
}
