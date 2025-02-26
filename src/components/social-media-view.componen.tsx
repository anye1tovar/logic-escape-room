import googleIcon from "../assets/google_icon.png";
import instagramIcon from "../assets/instagram_icon.webp";
import tiktokIcon from "../assets/tiktok_icon.png";
import whatsappIcon from "../assets/whatsapp_icon.png";
import { SocialMediaLinkProps } from "../models/social-media-link.props";

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
              className="w-14 h-14"
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
    <section className="w-full max-w-4xl px-6 mt-8">
      <h2 className="text-xl font-semibold mb-4 text-left text-[#ecbb0c]">Encuéntranos en:</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {socialMedia.map((item) => (
          <a
            key={item.platform}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-4 p-4 rounded-lg bg-white shadow-md hover:bg-gray-100 transition"
          >
            <img src={item.icon} alt={`${item.platform} icon`} className="w-14 h-14" />
            <div className="text-left">
              <h2 className="font-bold text-lg text-black">{item.platform}</h2>
              <p className="text-sm text-gray-600">{item.text}</p>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
