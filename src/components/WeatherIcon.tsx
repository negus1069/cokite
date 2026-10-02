interface Props {
  icon: string;
  label?: string;
  size?: number;
  className?: string;
}

export default function WeatherIcon({ icon, label, size = 28, className = '' }: Props) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}icons/${icon}.svg`}
      alt={label ?? icon}
      title={label}
      width={size}
      height={size}
      className={className}
      style={{ display: 'inline-block' }}
    />
  );
}
