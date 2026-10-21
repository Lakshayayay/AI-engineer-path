import { SWAP_PRESENTATION } from "./swap-presentation";

interface StarterSwapsProps {
  swapNames: string[];
  selectedSwapNames: string[];
  onToggle: (swapName: string) => void;
}

// Popular products to tap instead of typing. A tap toggles the chip on or off.
export function StarterSwaps({ swapNames, selectedSwapNames, onToggle }: StarterSwapsProps) {
  return (
    <section className="starter-swaps-section">
      <h2>Wanna swap any of these?</h2>
      <div className="starter-swaps-list">
        {swapNames.map((swapName) => {
          const isSelected = selectedSwapNames.includes(swapName);
          const presentation = SWAP_PRESENTATION[swapName];

          return (
            <button
              key={swapName}
              type="button"
              className={`swap-card${isSelected ? " is-selected" : ""}`}
              aria-label={swapName}
              aria-pressed={isSelected}
              onClick={() => onToggle(swapName)}
            >
              <div className="swap-title-row">
                {presentation?.icon && (
                  <svg className="swap-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d={presentation.icon.path} />
                  </svg>
                )}
                <p className="swap-title">{presentation?.label ?? swapName}</p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
