import Document, { Html, Head, Main, NextScript } from 'next/document';
const gtag= 'G-SC64X5RNW0';

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
        <body className="snap-y snap-mandatory h-screen overflow-y-scroll Default ">
          
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}

export default MyDocument
