import React from 'react';

export interface OptionItem {
    value: string;
    title: React.ReactNode;
    content?: React.ReactNode;
}

interface OptionSelectProps {
    value?: string;
    options: ReadonlyArray<OptionItem>;
    onChange: (value: string) => void;
}

/**
 * 现代化的卡片式单选组件
 */
const OptionSelect: React.FC<OptionSelectProps> = ({ value, options, onChange }) => {
    return (
        <div className="option-group" role="radiogroup" aria-label="选项">
            {options.map(option => {
                const isActive = option.value === value;
                return (
                    <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={isActive}
                        className={`option-card ${isActive ? 'option-card--active' : ''}`}
                        onClick={() => onChange(option.value)}
                    >
                        <div className="option-card__title">{option.title}</div>
                        {option.content && (
                            <div className="option-card__content">{option.content}</div>
                        )}
                    </button>
                );
            })}
        </div>
    );
};

export default OptionSelect;


