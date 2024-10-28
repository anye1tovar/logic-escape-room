import { DataView } from "primereact/dataview";
import { classNames } from "primereact/utils";
import googleIcon from "../../assets/google_icon.png";
import instagramIcon from "../../assets/instagram_icon.webp";
import tiktokIcon from "../../assets/tiktok_icon.png";
import whatsappIcon from "../../assets/whatsapp_icon.png";
import { SocialMediaLinkProps } from "../../models/social-media-link.props";

const socialMedia: SocialMediaLinkProps[] = [
  {
    platform: "Instagram",
    icon: instagramIcon,
    link: "https://www.instagram.com/logic.escapetunja/",
    text: "Síguenos para más diversión!",
  },
  {
    platform: "WhatsApp",
    icon: whatsappIcon,
    link: "https://wa.me/573181278688",
    text: "Reserva tu sala",
  },
  {
    platform: "TikTok",
    icon: tiktokIcon,
    link: "https://www.tiktok.com/@logic.escaperoom",
    text: "Desafía tu mente",
  },
  {
    platform: "Google Review",
    icon: googleIcon,
    link: "https://maps.app.goo.gl/9M2Q558VShT4Bzjr9",
    text: "Estamos ubicados aquí",
  },
];

export default function SocialMediaView() {
  const socialMediaLink = (item) => {
    return (
      <a
        href={item.link}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        <div
          key={item.platform}
          className="flex items-center space-x-4 justify-between p-4 rounded-lg bg-white shadow-md hover:bg-gray-100 transition mb-4"
        >
          <div className="flex gap-3">
            <img
              src={item.icon}
              alt={`${item.platform} icon`}
              className="w-14"
            />
            <div className="text-left">
              <h2 className="font-bold text-lg">{item.platform}</h2>
              <p className="text-sm text-gray-600">{item.text}</p>
            </div>
          </div>
          <span className="ml-auto">➡️</span>
        </div>
      </a>
    );
  };

  return (
    <section className="w-full max-w-md px-6">
      <h2 className="text-xl font-semibold mb-4 text-left">Encuentranos en:</h2>
      {socialMedia.map((item) => socialMediaLink(item))}
    </section>
  );
}
