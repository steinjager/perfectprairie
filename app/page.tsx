import Image from "next/image";
import { InquiryForm } from "./components/InquiryForm";

const services = [
  {
    number: "01",
    title: "On-site consultations",
    kicker: "A clear plan for the land",
    body: "Interested in conservation practices but unsure where to begin? We visit your property, read the site, and give you practical recommendations for a prairie plot, a ditch conversion, a new construction zone, or another space with potential.",
    scope: "Prairies · Ditches · New construction",
  },
  {
    number: "02",
    title: "Native landscape design + installation",
    kicker: "Designed for your place",
    body: "We create a custom landscape plan using exclusively native plants, tailored to your site and the way you want to live with it. We can remove existing vegetation, install the plants, and leave you with a clear watering and maintenance plan.",
    scope: "Plan · Prepare · Plant · Support",
  },
  {
    number: "03",
    title: "Prairie + wildflower plots",
    kicker: "Where grass grows, prairie can grow better",
    body: "From annual wildflowers at a school, library, or city boulevard to a native perennial prairie at home, we prepare the ground and install a high-performance planting shaped around the space and your desired height.",
    scope: "Yards · Schools · Libraries · Boulevards",
  },
];

const steps = [
  ["01", "Meet the land", "We start on site: sunlight, soil, drainage, existing growth, access, and what you want the space to do."],
  ["02", "Build the plan", "We recommend the right conservation approach, native plant palette, layout, height, and timing for your goals."],
  ["03", "Prepare + install", "Strong establishment starts before planting. We remove existing vegetation and install in the right season."],
  ["04", "Help it thrive", "You get straightforward watering and maintenance guidance for the establishment years and the seasons beyond."],
];

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Perfect Prairie home">
          <span className="brand-mark" aria-hidden="true">✺</span>
          <span>Perfect Prairie</span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#services">Services</a>
          <a href="#vision">Vision</a>
          <a href="#process">Process</a>
        </nav>
        <a className="header-cta" href="#estimate">Start a project <span aria-hidden="true">↗</span></a>
      </header>

      <section className="hero" id="top">
        <div className="hero-image" role="img" aria-label="A dense planting of golden black-eyed Susan wildflowers" />
        <div className="hero-shade" />
        <div className="hero-content">
          <p className="eyebrow light">Native landscapes · Central Illinois</p>
          <h1>Less lawn.<br /><em>More habitat.</em></h1>
          <p className="hero-copy">Turn a piece of your property into something that thrives. We design and establish living landscapes built for Illinois—and for everything that lives here.</p>
          <div className="hero-actions">
            <a className="button button-sun" href="#estimate">Start a project <span aria-hidden="true">↗</span></a>
            <a className="text-link light" href="#services">Explore our services <span aria-hidden="true">↓</span></a>
          </div>
        </div>
        <p className="hero-note">Rewild the ordinary.<br />Make room for life.</p>
      </section>

      <div className="field-note" aria-label="Perfect Prairie approach">
        <span>Consult the land</span><i>✺</i><span>Design with natives</span><i>✺</i><span>Prepare + install</span><i>✺</i><span>Rewild Illinois</span>
      </div>

      <section className="intro section-pad">
        <p className="eyebrow">What we create</p>
        <div className="intro-grid">
          <h2>Not just flowers—<br />a thriving ecosystem.</h2>
          <div>
            <p className="lead">A beautiful landscape can also rebuild habitat, hold better soil, feed pollinators, and ask less of you over time.</p>
            <p>We shape every recommendation, design, and planting around your site, your priorities, and the kind of living landscape you want to watch unfold.</p>
          </div>
        </div>
      </section>

      <section className="services" id="services" aria-label="Perfect Prairie services">
        {services.map((service) => (
          <article className="service-card" key={service.number}>
            <div className="service-number">{service.number}</div>
            <p className="eyebrow">{service.kicker}</p>
            <h3>{service.title}</h3>
            <p>{service.body}</p>
            <div className="service-season"><span aria-hidden="true">◌</span>{service.scope}</div>
          </article>
        ))}
      </section>

      <section className="feature section-pad">
        <div className="feature-photo">
          <Image src="/images/work/central-illinois-pollinator-garden.jpg" alt="A lush pollinator garden glowing with coneflowers, bee balm, and black-eyed Susans" fill sizes="(max-width: 900px) 100vw, 46vw" unoptimized />
          <div className="photo-tag">A living landscape</div>
        </div>
        <div className="feature-copy">
          <p className="eyebrow">Why prairie</p>
          <h2>Wild by nature.<br />Intentional by design.</h2>
          <p className="lead">The best low-maintenance landscapes are not empty. They are busy doing the work.</p>
          <ul className="benefit-list">
            <li><span>01</span><div><strong>Built for the climate</strong><p>Deep-rooted native plants are adapted to Illinois seasons and rainfall.</p></div></li>
            <li><span>02</span><div><strong>Habitat from the ground up</strong><p>Flowers, grasses, seeds, and stems support life across the seasons.</p></div></li>
            <li><span>03</span><div><strong>Less input over time</strong><p>No routine fertilizer or irrigation once an established prairie finds its rhythm.</p></div></li>
          </ul>
        </div>
      </section>

      <section className="rewild section-pad" id="vision">
        <div className="rewild-heading">
          <div>
            <p className="eyebrow light">A bigger idea</p>
            <h2>Rewild the<br />ordinary.</h2>
          </div>
          <div>
            <p className="lead">A ditch. A boulevard. A schoolyard. A three-acre lawn.</p>
            <p>Places we have been taught to mow and overlook can become ribbons of biodiversity. Wherever grass grows, prairie can grow better.</p>
          </div>
        </div>
        <div className="rewild-gallery">
          <figure className="rewild-gallery-main">
            <div className="rewild-image">
              <Image src="/images/work/curbside-monarch-waystation.jpg" alt="A curbside monarch waystation filled with native flowers beside a city sidewalk" fill sizes="(max-width: 900px) 100vw, 60vw" unoptimized />
            </div>
            <figcaption><strong>Imagine the curb alive.</strong><span>Flowers, food, shelter, and a street people remember.</span></figcaption>
          </figure>
          <figure className="rewild-gallery-side">
            <div className="rewild-image">
              <Image src="/images/work/boulevard-before.jpg" alt="A wide mowed grass boulevard between two neighborhood streets" fill sizes="(max-width: 900px) 100vw, 32vw" unoptimized />
            </div>
            <figcaption><strong>See more than lawn.</strong><span>Every ordinary strip is a chance to restore habitat.</span></figcaption>
          </figure>
        </div>
      </section>

      <section className="prairie-story section-pad" id="prairie-story">
        <div className="prairie-story-heading">
          <div>
            <p className="eyebrow">The Prairie State</p>
            <h2>Let&apos;s make that<br />visible again.</h2>
          </div>
          <p className="lead">Prairie is not a trend imported from somewhere else. It is the landscape that built Illinois soil—and a living inheritance we can invite home again.</p>
        </div>

        <div className="prairie-gallery">
          <figure className="prairie-gallery-primary">
            <div className="prairie-gallery-image">
              <Image src="/images/illinois-wildflowers.jpg" alt="Purple blazing star, rattlesnake master, and yellow wildflowers in a Central Illinois prairie restoration" fill sizes="(max-width: 900px) 100vw, 62vw" unoptimized />
            </div>
            <figcaption>
              <span>Central Illinois prairie restoration, 2019</span>
              <a href="https://commons.wikimedia.org/wiki/File:Illinois_wildflowers.jpg" target="_blank" rel="noreferrer">American Lotus / Wikimedia Commons · CC BY-SA 4.0 ↗</a>
            </figcaption>
          </figure>

          <figure className="prairie-gallery-secondary prairie-gallery-detail">
            <div className="prairie-gallery-image">
              <Image src="/images/work/native-wildflower-detail.jpg" alt="Purple and yellow wildflowers growing densely together" fill sizes="(max-width: 900px) 100vw, 30vw" unoptimized />
            </div>
            <figcaption><span>Color, structure, and seed across the seasons</span></figcaption>
          </figure>
        </div>

        <div className="prairie-history">
          <div className="prairie-history-image">
            <Image src="/images/prairie-spirit-1915.jpg" alt="A broad Illinois prairie view framed by honey locust trees, published in 1915" fill sizes="(max-width: 900px) 100vw, 55vw" unoptimized />
          </div>
          <div className="prairie-history-copy">
            <p className="eyebrow light">From the archive · 1915</p>
            <h3>“The broad view of the prairie.”</h3>
            <p>In 1820, prairie covered roughly 22 million acres of Illinois. By 1978, fewer than 2,300 acres of high-quality prairie remained. One property will not recreate that lost expanse—but every planting can reconnect a piece of its living fabric.</p>
            <a className="text-link light" href="https://dnr.illinois.gov/education/atoz/ilprairies.html" target="_blank" rel="noreferrer">Explore Illinois prairie history <span aria-hidden="true">↗</span></a>
            <p className="archive-credit"><a href="https://commons.wikimedia.org/wiki/File:The_prairie_spirit_in_landscape_gardening;_what_the_people_of_Illinois_have_done_and_can_do_toward_designing_and_planting_public_and_private_grounds_for_efficiency_and_beauty_(1915)_(14594677308).jpg" target="_blank" rel="noreferrer">The Prairie Spirit in Landscape Gardening, University of Illinois, 1915 · Cornell University Library / Internet Archive · no known copyright restrictions ↗</a></p>
          </div>
        </div>
      </section>

      <section className="process section-pad" id="process">
        <div className="section-heading">
          <p className="eyebrow light">How it works</p>
          <h2>From possibility<br />to rooted place.</h2>
        </div>
        <div className="steps">
          {steps.map(([number, title, body]) => (
            <article className="step" key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about section-pad" id="about">
        <div className="about-portrait">
          <Image src="/images/work/founder-in-the-field.jpg" alt="The founder of Perfect Prairie exploring a natural landscape" fill sizes="(max-width: 900px) 100vw, 34vw" unoptimized />
        </div>
        <div className="about-copy">
          <p className="eyebrow">Rooted close to home</p>
          <h2>This work starts in our own yard.</h2>
          <p className="lead">Perfect Prairie is growing from a simple conviction: the ordinary spaces around us can support extraordinary life.</p>
          <p>We are actively turning our own three-acre yard into native perennial prairie—and helping Central Illinois landowners, schools, libraries, and communities imagine what their ground could become.</p>
          <a className="text-link" href="https://www.facebook.com/people/Perfect-Prairie/61576453635334/" target="_blank" rel="noreferrer">Follow the work on Facebook <span aria-hidden="true">↗</span></a>
        </div>
      </section>

      <section className="estimate" id="estimate">
        <div className="estimate-intro">
          <p className="eyebrow light">Start a conversation</p>
          <h2>What could<br />your land become?</h2>
          <p>Tell us what you know. We&apos;ll follow up to talk through the site, your priorities, and the service that fits.</p>
          <div className="contact-lines">
            <div className="contact-line"><span>Email</span><a href="mailto:contact@perfectprairie.com">contact@perfectprairie.com</a></div>
            <div className="contact-line"><span>Call or text</span><a href="tel:+13096132016">(309) 613-2016</a></div>
          </div>
        </div>
        <InquiryForm />
      </section>

      <footer>
        <div className="footer-brand">
          <span className="footer-brand-mark" aria-hidden="true">✺</span>
          <strong>Perfect Prairie</strong>
          <p>Consultation, native landscape design and installation, and prairie or wildflower plots for Central Illinois.</p>
        </div>
        <div className="footer-links">
          <div><span>Explore</span><a href="#services">Services</a><a href="#vision">Vision</a><a href="#process">Process</a></div>
          <div><span>Connect</span><a href="mailto:contact@perfectprairie.com">Email</a><a href="tel:+13096132016">Call or text</a><a href="https://www.facebook.com/people/Perfect-Prairie/61576453635334/" target="_blank" rel="noreferrer">Facebook</a></div>
        </div>
        <div className="footer-bottom"><span>© {new Date().getFullYear()} Perfect Prairie</span><span>Less lawn. More habitat.</span></div>
      </footer>
    </main>
  );
}
