import Document, { Html, Head, Main, NextScript } from 'next/document';
const gtag= 'G-9PZEXD5SEW';

class MyDocument extends Document {

  render() {
    return (
      <Html lang="en">
          <Head>
        <meta name="robots" content="index, follow" />
   
          <link rel="shortcut icon" href="/favicon.ico" type="image/x-icon"/>
          <link rel="icon" href="/favicon.ico" type="image/x-icon"/>
          <meta name="theme-color" content="#ffffff"/>
          <script
            async
            src={`https://www.googletagmanager.com/gtag/js?id=G-9PZEXD5SEW`}
          />           
          <script
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', 'G-9PZEXD5SEW', {
                  page_path: window.location.pathname,
                });
            `,
            }}
          />
               
   <meta name="p:domain_verify" content="f13494dbdb591fc3cc3233e6f660a5eb"/>
        <meta name="yandex-verification" content="ff59d7507fd2396e" />


   {/* adsense */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2046215299064356"
          crossOrigin="anonymous"
        ></script>
        <meta name="google-adsense-account" content="ca-pub-2046215299064356" />


        </Head>     
        <body className="snap-y snap-mandatory h-screen overflow-y-scroll Default ">
          
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}

export default MyDocument
