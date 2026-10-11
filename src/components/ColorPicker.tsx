import { hexToHsl, hslToHex } from "@/lib/color";

const hueTrack = "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)";

export function ColorPicker({
  value,
  onChange,
  presets,
}: {
  value: string;
  onChange: (hex: string) => void;
  presets?: string[];
}) {
  const [h, s, l] = hexToHsl(value);

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-11 h-11 rounded-full shrink-0 border border-[var(--border)] shadow-sm"
          style={{ backgroundColor: value }}
        />
        <div className="flex-1 space-y-2.5">
          <input
            type="range"
            min={0}
            max={360}
            value={h}
            onChange={(event) => onChange(hslToHex(Number(event.target.value), s, l))}
            className="w-full h-2.5 rounded-full appearance-none cursor-pointer"
            style={{ background: hueTrack }}
          />
          <input
            type="range"
            min={0}
            max={100}
            value={s}
            onChange={(event) => onChange(hslToHex(h, Number(event.target.value), l))}
            className="w-full h-2.5 rounded-full appearance-none cursor-pointer"
            style={{
              accentColor: value,
              background: `linear-gradient(to right, ${hslToHex(h, 0, l)}, ${hslToHex(h, 100, l)})`,
            }}
          />
          <input
            type="range"
            min={5}
            max={95}
            value={l}
            onChange={(event) => onChange(hslToHex(h, s, Number(event.target.value)))}
            className="w-full h-2.5 rounded-full appearance-none cursor-pointer"
            style={{
              accentColor: value,
              background: `linear-gradient(to right, ${hslToHex(h, s, 5)}, ${hslToHex(h, s, 50)}, ${hslToHex(h, s, 95)})`,
            }}
          />
        </div>
      </div>
      {presets && presets.length > 0 && (
        <div className="flex gap-2.5">
          {presets.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onChange(item)}
              className={`w-8 h-8 rounded-full transition-transform active:scale-90 ${value.toLowerCase() === item.toLowerCase() ? "ring-2 ring-offset-2 ring-[var(--text-muted)]" : ""}`}
              style={{ backgroundColor: item }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
