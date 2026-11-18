export default function PremiumServiceRequestRedirect() {
  return null;
}

export async function getServerSideProps() {
  return {
    redirect: {
      destination: '/premium-payment',
      permanent: false,
    },
  };
}
