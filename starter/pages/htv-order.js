export default function HtvOrderRedirect() {
  return null
}

export async function getServerSideProps() {
  return {
    redirect: {
      destination: '/logo',
      permanent: true,
    },
  }
}
