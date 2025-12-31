import Document, { Html, Head, Main, NextScript } from 'next/document';
const gtag= 'G-SC64X5RNW0';

class MyDocument extends Document {

  render() {
    return (
      <Html lang="en">
          <Head>
        <meta name="robots" content="index, follow" />
   
          <link rel="icon" type="image/png" href="/DOSNINE_FAVICON.png" />
          <link rel="shortcut icon" type="image/png" href="/DOSNINE_FAVICON.png" />
          <link rel="apple-touch-icon" href="/DOSNINE_FAVICON.png" />
          <meta name="theme-color" content="#ff6b35"/>
          <script
            async
            src={`https://www.googletagmanager.com/gtag/js?id=${gtag}`}
          />           
          <script
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gtag}', {
                  page_path: window.location.pathname,
                });
            `,
            }}
          />
               
   <meta name="p:domain_verify" content="f13494dbdb591fc3cc3233e6f660a5eb"/>
        <meta name="yandex-verification" content="ff59d7507fd2396e" />




        </Head>     
        <body>
          
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}

export default MyDocument
