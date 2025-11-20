import React from 'react';
import css from '../styles/layout.module.css';

const Layout = ({children}) => {
    return (
        <main className={css.main}>
            {children}
       </main>
    )
}

export default Layout;
