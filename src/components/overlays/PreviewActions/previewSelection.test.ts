import { createPreviewSelectionStore } from '@/components/overlays/PreviewActions/previewSelection';

describe('createPreviewSelectionStore', () => {
  it('no deja marcar a la vez dos tarjetas con la misma clave', () => {
    const store = createPreviewSelectionStore();
    // Septiembre y octubre de la misma serie; el café va suelto.
    const keys: Record<string, string | null> = {
      september: 'series:rent',
      october: 'series:rent',
      coffee: 'coffee',
      projected: null,
    };
    store.setResolveKey((_kind, id) => keys[id] ?? null);
    store.start({ ids: ['october'], kind: 'transaction', mode: 'copy' });

    expect(store.getStatus('transaction', 'september')).toBe('disabled');
    expect(store.getStatus('transaction', 'coffee')).toBe('unselected');
    expect(store.getStatus('transaction', 'projected')).toBe('disabled');

    store.toggle('september');
    store.toggle('coffee');
    expect(store.getSelection()?.ids).toEqual(['october', 'coffee']);

    // Al desmarcar octubre, septiembre vuelve a estar disponible.
    store.toggle('october');
    expect(store.getStatus('transaction', 'september')).toBe('unselected');
    store.toggle('september');
    expect(store.getSelection()?.ids).toEqual(['coffee', 'september']);
  });
});
