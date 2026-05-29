import type { LayerConfig, Manifest } from '../../../runtime/types';
import { ParamControls } from './ParamControls';
import { IconButton } from './IconButton';
import { ChevronUpIcon, ChevronDownIcon, TrashIcon } from './icons';
import './LayerStack.css';

interface Props {
  layers: LayerConfig[];
  catalog: Manifest[];
  lastReason: string | null;
  onRemove: (index: number) => void;
  onReorder: (from: number, to: number) => void;
  onParam: (index: number, key: string, value: unknown) => void;
}

export function LayerStack({ layers, catalog, lastReason, onRemove, onReorder, onParam }: Props) {
  return (
    <div className="layer-stack">
      <h2 className="layer-stack__title">Layers</h2>
      {lastReason && (
        <p className="layer-stack__hint" role="alert">
          {lastReason}
        </p>
      )}
      {layers.length === 0 && (
        <p className="layer-stack__empty">Pick an effect to start a stack.</p>
      )}
      <ol className="layer-stack__list">
        {layers.map((layer, i) => {
          const manifest = catalog.find((m) => m.id === layer.effectId);
          const name = manifest?.name ?? layer.effectId;
          return (
            <li key={`${layer.effectId}-${i}`} className="layer-stack__item">
              <header className="layer-stack__item-head">
                <span className="layer-stack__name">{name}</span>
                <span className="layer-stack__role" data-role={layer.layerRole}>
                  {layer.layerRole}
                </span>
                <span className="layer-stack__actions">
                  <IconButton
                    label={`Move ${name} up`}
                    icon={<ChevronUpIcon />}
                    disabled={i === 0}
                    onClick={() => onReorder(i, i - 1)}
                  />
                  <IconButton
                    label={`Move ${name} down`}
                    icon={<ChevronDownIcon />}
                    disabled={i === layers.length - 1}
                    onClick={() => onReorder(i, i + 1)}
                  />
                  <IconButton
                    label={`Remove ${name}`}
                    icon={<TrashIcon />}
                    onClick={() => onRemove(i)}
                  />
                </span>
              </header>
              {manifest && manifest.params.length > 0 && (
                <ParamControls
                  specs={manifest.params}
                  values={layer.params}
                  onChange={(key, value) => onParam(i, key, value)}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
