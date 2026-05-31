import { useState } from 'react';
import type { Marker } from '../../../../runtime/types';
import { PlusIcon, TrashIcon } from '../icons';
import './MarkerListEditor.css';

export interface MarkerListEditorProps {
  value: Marker[];
  onChange: (value: Marker[]) => void;
  ariaLabel: string;
}

/** Coerce an unknown into a clean Marker[], tolerating partially-shaped input. */
function normalize(value: unknown): Marker[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((m) => {
      const loc = (m as Marker)?.location;
      if (!Array.isArray(loc) || loc.length < 2) return null;
      return {
        location: [Number(loc[0]) || 0, Number(loc[1]) || 0] as [number, number],
        size: Number((m as Marker)?.size) || 0,
      };
    })
    .filter((m): m is Marker => m !== null);
}

/**
 * MarkerListEditor - a compact editor for a list of geo markers ([lat, long] +
 * size), used by the 'marker-list' param (cobe globe markers). An "add" row
 * (lat / long / size + plus button) appends a marker; each existing row exposes
 * the same three numeric fields plus a trash button to remove it. Emits the full
 * Marker[] on every edit. On-brand: --input-bg wells, hairline borders, mono
 * numerics, 40px-tall icon buttons, Lucide plus/trash icons.
 */
export function MarkerListEditor({ value, onChange, ariaLabel }: MarkerListEditorProps) {
  const markers = normalize(value);
  const [lat, setLat] = useState('0');
  const [long, setLong] = useState('0');
  const [size, setSize] = useState('0.05');

  const editMarker = (index: number, next: Marker) => {
    const out = markers.slice();
    out[index] = next;
    onChange(out);
  };

  const removeMarker = (index: number) => {
    onChange(markers.filter((_, i) => i !== index));
  };

  const addMarker = () => {
    onChange([
      ...markers,
      { location: [Number(lat) || 0, Number(long) || 0], size: Number(size) || 0.05 },
    ]);
  };

  return (
    <div className="tl-markers" role="group" aria-label={ariaLabel}>
      {markers.length > 0 && (
        <ul className="tl-markers__list">
          {markers.map((m, i) => (
            <li key={i} className="tl-markers__row">
              <input
                className="tl-markers__num"
                type="number"
                aria-label={`${ariaLabel} marker ${i + 1} latitude`}
                value={m.location[0]}
                step={0.1}
                onChange={(e) =>
                  editMarker(i, { ...m, location: [Number(e.target.value), m.location[1]] })
                }
              />
              <input
                className="tl-markers__num"
                type="number"
                aria-label={`${ariaLabel} marker ${i + 1} longitude`}
                value={m.location[1]}
                step={0.1}
                onChange={(e) =>
                  editMarker(i, { ...m, location: [m.location[0], Number(e.target.value)] })
                }
              />
              <input
                className="tl-markers__num"
                type="number"
                aria-label={`${ariaLabel} marker ${i + 1} size`}
                value={m.size}
                step={0.01}
                min={0}
                onChange={(e) => editMarker(i, { ...m, size: Number(e.target.value) })}
              />
              <button
                type="button"
                className="tl-markers__btn tl-markers__btn--remove"
                aria-label={`Remove ${ariaLabel} marker ${i + 1}`}
                onClick={() => removeMarker(i)}
              >
                <TrashIcon width={14} height={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="tl-markers__row tl-markers__row--add">
        <input
          className="tl-markers__num"
          type="number"
          aria-label={`${ariaLabel} new latitude`}
          placeholder="lat"
          value={lat}
          step={0.1}
          onChange={(e) => setLat(e.target.value)}
        />
        <input
          className="tl-markers__num"
          type="number"
          aria-label={`${ariaLabel} new longitude`}
          placeholder="long"
          value={long}
          step={0.1}
          onChange={(e) => setLong(e.target.value)}
        />
        <input
          className="tl-markers__num"
          type="number"
          aria-label={`${ariaLabel} new size`}
          placeholder="size"
          value={size}
          step={0.01}
          min={0}
          onChange={(e) => setSize(e.target.value)}
        />
        <button
          type="button"
          className="tl-markers__btn tl-markers__btn--add"
          aria-label={`Add ${ariaLabel} marker`}
          onClick={addMarker}
        >
          <PlusIcon width={14} height={14} />
        </button>
      </div>
    </div>
  );
}
