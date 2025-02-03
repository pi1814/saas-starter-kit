import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import type { NextPageWithLayout } from 'types';
import { useTranslation } from 'next-i18next';
import useTeam from 'hooks/useTeam';
import { Error, Loading } from '@/components/shared';
import { MessageCircleCode } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const Products: NextPageWithLayout = () => {
  const { t } = useTranslation('common');
  const { isLoading, isError, team } = useTeam();
  const [slug, setSlug] = useState<string | undefined>(team?.slug);
  const [product, setProduct] = useState({
    name: t('bui-chat'),
    href: `/teams/${slug}/chat`,
    icon: MessageCircleCode,
    active: false,
  });

  useEffect(() => {
    setSlug(team?.slug);
    setProduct({
      name: t('bui-chat'),
      href: `/teams/${team?.slug}/chat`,
      icon: MessageCircleCode,
      active: false,
    });
  }, [team]);

  if (isLoading) {
    return <Loading />;
  }

  if (isError) {
    return <Error message={isError.message} />;
  }

  if (!team) {
    return <Error message={t('team-not-found')} />;
  }

  return (
    <div className="p-3">
      <h1 className="text-2xl font-bold mb-2">{t('all-products')}</h1>
      <p className="text-sm text-gray-700 mb-4">{t('products-description')}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        <Link href={product.href} passHref>
          <div className="border rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg transition-shadow">
            <div className="flex items-center mb-2">
              <product.icon className="h-6 w-6 text-blue-500" />
              <h3 className="ml-2 text-lg font-semibold">{product.name}</h3>
            </div>
            <p className="text-gray-600">{t('click-to-view')}</p>
          </div>
        </Link>
      </div>
    </div>
  );
};

export async function getServerSideProps({
  locale,
}: GetServerSidePropsContext) {
  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
    },
  };
}

export default Products;
