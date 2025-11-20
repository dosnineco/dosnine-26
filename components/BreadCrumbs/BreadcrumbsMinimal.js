import { useRouter } from 'next/router';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FiHome, FiChevronRight, FiArrowRight } from 'react-icons/fi';


// Variation 1: Minimal Breadcrumbs
const BreadcrumbsMinimal = () => {
  const router = useRouter();
  const [breadcrumbs, setBreadcrumbs] = useState([]);

  useEffect(() => {
    const pathArray = router.asPath.split('/').filter(path => path);
    const breadcrumbArray = pathArray.map((path, index) => {
      const href = '/' + pathArray.slice(0, index + 1).join('/');
      return { href, label: path };
    });
    setBreadcrumbs(breadcrumbArray);
  }, [router.asPath]);

  return (
    <nav className="text-sm text-gray-600">
      <ol className="flex space-x-2">
        <li>
          <Link href="/" className="hover:text-blue-600 transition-colors">
            Home
          </Link>
        </li>
        {breadcrumbs.map((breadcrumb, index) => (
          <li key={index} className="flex items-center">
            <FiArrowRight className="mx-1 text-gray-400" />
            <Link href={breadcrumb.href} className="hover:text-blue-600 transition-colors">
              {breadcrumb.label}
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
};






export default BreadcrumbsMinimal;