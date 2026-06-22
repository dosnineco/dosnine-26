import Head from 'next/head'
import Link from 'next/link'

export default function About() {
	return (
		<>
			<Head>
				<title>About Dosnine — Jamaica Real Estate, Media & Tech</title>
				<meta name="description" content="Dosnine Limited (Dosnine Co / Dosnine Media) is a Jamaica-based technology and digital media company focused on real estate listings, rentals, property management, agent matching, and digital marketing services." />
				<meta name="keywords" content="Dosnine, Jamaica real estate, property listings, rentals, property management, agent matching, digital marketing, Dosnine Media" />
				<meta name="author" content="Dosnine Limited" />
				<meta property="og:title" content="Dosnine — Jamaica Real Estate, Media & Tech" />
				<meta property="og:description" content="Find apartments, houses, commercial properties, or connect with verified agents in Jamaica. Dosnine also offers media, marketing, and software services for local businesses." />
				<meta property="og:type" content="website" />
				<meta property="og:url" content="https://www.dosnine.com/" />
			</Head>

			<main className="max-w-3xl mx-auto py-12 px-4">
				<h1 className="text-3xl font-bold mb-4">About Dosnine</h1>

				<p className="mb-4 text-lg">
					Dosnine Limited, often operating as Dosnine Co or Dosnine Media, is a Jamaica-based technology and digital media company. We specialize in real estate listings, property rentals, and property management while also providing media, marketing, and software development services to help local businesses grow.
				</p>

				<section className="mb-6">
					<h2 className="text-2xl font-semibold mb-2">What we do</h2>
					<ul className="list-disc pl-5 space-y-2">
						<li>
							<strong>Real Estate Platform:</strong> We operate <a href="https://www.dosnine.com/" className="text-accent underline">Dosnine</a>, a digital search engine for apartments, houses, and commercial properties across Jamaica.
						</li>
						<li>
							<strong>Agent Matching:</strong> Connect with verified real estate agents for buying, selling, renting, or getting property valuations.
						</li>
						<li>
							<strong>Media & Tech:</strong> Dosnine Media delivers online software, marketing, and advertising support for local businesses and contractors.
						</li>
					</ul>
				</section>

				<section className="mb-6">
					<h2 className="text-2xl font-semibold mb-2">Why choose Dosnine</h2>
					<p className="mb-2">We combine local market knowledge with modern technology to make property search, management, and marketing simple and reliable for Jamaicans and businesses operating in Jamaica.</p>
					<p className="mb-2">Our platform is designed to help users quickly discover available properties and connect with trusted professionals.</p>
				</section>

				<section className="mb-6">
					<h2 className="text-2xl font-semibold mb-2">Key links & contact</h2>
					<ul className="list-inside list-disc pl-5">
						<li>Visit our property search: <a href="https://www.dosnine.com/" className="text-accent underline">dosnine.com</a></li>
						<li>See our work on Instagram: <a href="https://www.instagram.com/reel/DRuwM05CVVI/" className="text-accent underline">Reel</a></li>
						<li>Founder profile: <a href="https://www.linkedin.com/in/tahjay-thompson" className="text-accent underline">LinkedIn</a></li>
					</ul>
				</section>

				<section className="mb-6">
					<h2 className="text-2xl font-semibold mb-2">Get started</h2>
					<p className="mb-3">Looking to buy or rent in Jamaica, or advertise your property or business? Start here:</p>
					<div className="flex gap-3">
						<Link href="/" legacyBehavior><a className="px-4 py-2 bg-accent text-white rounded-xl">Search Properties</a></Link>
						<a href="https://www.dosnine.com/contact" className="px-4 py-2 border border-accent text-accent rounded-xl">Contact Us</a>
					</div>
				</section>

			</main>
		</>
	)
}
