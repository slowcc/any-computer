import React from 'react';
import MaterialIcon from './MaterialIcon';

interface RadioSwitchItem {
  value: string;
  icon?: string;
  label?: React.ReactNode | string;
  customRender?: React.ReactNode;
}

interface RadioSwitchProps {
  items: RadioSwitchItem[];
  value: string;
  onChange: (value: string) => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const RadioSwitch: React.FC<RadioSwitchProps> = ({
  items,
  value,
  onChange,
  size = 'md',
  className
}) => {
  const containerClasses = size === 'sm' 
    ? "flex items-center space-x-0.5 rounded-lg p-[3px] bg-bg-tertiary text-xs"
    : size === 'md'
      ? "flex items-center space-x-1 rounded-md p-1 bg-bg-tertiary"
      : "flex items-center space-x-2 rounded-md p-2 bg-bg-tertiary";

  const buttonClasses = (itemValue: string) => {
    const baseClasses = size === 'sm'
      ? "px-1.5 py-[2px] rounded-md flex items-center space-x-0.5"
      : size === 'md'
        ? "px-2 py-1 rounded-md flex items-center space-x-1"
        : "px-3 py-2 rounded-md flex items-center space-x-2";

    const activeClasses = value === itemValue
      ? 'bg-bg-contrast text-text-primary'
      : 'text-text-secondary hover:bg-bg-hover opacity-80';

    return `${baseClasses} ${activeClasses}`;
  };

  const iconSize = size === 'sm' ? 12 : size === 'md' ? 16 : 20;
  const textClasses = size === 'sm' ? 'text-xs leading-[13px]' : size === 'md' ? 'text-sm' : 'text-base';

  return (
    <div className={`${containerClasses} ${className}`}>
      {items.map((item) => (
        <React.Fragment key={item.value}>
          <button
            onClick={() => onChange(item.value)}
            className={buttonClasses(item.value)}
          >
            {item.customRender ? (
              item.customRender
            ) : (
              <>
                {item.icon && <MaterialIcon icon={item.icon} size={iconSize} />}
                <span className={textClasses}>{item.label}</span>
              </>
            )}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
};

export default RadioSwitch;