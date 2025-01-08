import { copyToClipboard } from '@/lib/common';
import { BookCopy } from 'lucide-react';
import { useTranslation } from 'next-i18next';
import { Button } from 'react-daisyui';
import { toast } from 'react-hot-toast';

interface CopyToClipboardProps {
  value: string;
}

const CopyToClipboardButton = ({ value }: CopyToClipboardProps) => {
  const { t } = useTranslation('common');

  const handleCopy = () => {
    copyToClipboard(value);
    toast.success(t('copied-to-clipboard'));
  };

  return (
    <Button
      variant="link"
      size="xs"
      className="tooltip p-0"
      data-tip={t('copy-to-clipboard')}
      onClick={handleCopy}
    >
      <BookCopy className="w-5 h-5 text-secondary" />
    </Button>
  );
};

export default CopyToClipboardButton;
