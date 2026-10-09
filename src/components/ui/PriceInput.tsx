import React from 'react';

interface PriceInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: number;
  onValueChange: (v: number) => void;
}

/**
 * Campo decimal/monetário: aceita vírgula OU ponto como separador de centavos,
 * sem reformatar o texto enquanto o usuário digita (não perde o que já foi
 * digitado e não move o cursor). Converte para número a cada alteração.
 */
export const PriceInput: React.FC<PriceInputProps> = ({ value, onValueChange, ...rest }) => {
  const [text, setText] = React.useState<string>(() => (value ? String(value).replace('.', ',') : ''));
  const lastValue = React.useRef<number>(value);

  // Sincroniza quando o valor muda por fora (ex.: modal reaberto com outro dado)
  React.useEffect(() => {
    if (value !== lastValue.current) {
      lastValue.current = value;
      setText(value ? String(value).replace('.', ',') : '');
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Só dígitos e separadores; no máximo um separador
    let t = e.target.value.replace(/[^\d.,]/g, '');
    const parts = t.split(/[.,]/);
    if (parts.length > 2) t = `${parts[0]},${parts.slice(1).join('')}`;
    setText(t);

    const num = parseFloat(t.replace(',', '.'));
    lastValue.current = Number.isNaN(num) ? 0 : num;
    onValueChange(lastValue.current);
  };

  return <input type="text" inputMode="decimal" value={text} onChange={handleChange} {...rest} />;
};
