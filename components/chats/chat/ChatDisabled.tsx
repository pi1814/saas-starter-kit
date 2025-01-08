import Card from '@/components/shared/Card';
import { useTranslation } from 'next-i18next';

export default function ChatDisabled() {
  const { t } = useTranslation('common');
  return (
    <div className="flex mt-auto w-full">
      <Card>
        <Card.Body>
          <Card.Header>
            <Card.Title>{t('bui-chat-disabled-title')}</Card.Title>
            <Card.Description>
              {t('bui-chat-disabled-description')}
            </Card.Description>
          </Card.Header>
        </Card.Body>
      </Card>
    </div>
  );
}
