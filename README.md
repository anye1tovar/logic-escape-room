# Logic Escape Room Landing Page

Welcome to the **Logic Escape Room** landing page project! This project is a single-page website designed to showcase an exciting escape room experience with a captivating and user-friendly interface. It is built using modern frontend technologies and is hosted on AWS for global reach and scalability.

## 🌐 Live Demo

Access the live site [here](https://d1y236odjfkrll.cloudfront.net/)

## 🚀 Features

- **Responsive Design**: Ensures a seamless experience across desktop, tablet, and mobile devices.
- **QR Code Generation**: Allows users to generate a QR code for quick access to the landing page from mobile devices.
- **Dynamic Styling with Tailwind CSS and Sass**: For custom, scalable, and maintainable styles.
- **Secure Hosting on AWS**: Leveraging AWS S3 for static hosting and CloudFront for global content delivery over HTTPS.

## 🛠️ Technologies Used

- **React & TypeScript**: Core library for building a type-safe and maintainable UI.
- **Vite**: Fast and optimized build tool for a quick development experience.
- **Tailwind CSS & Sass**: Combination for responsive and customizable styling.
- **AWS S3**: Used as a static file storage for hosting.
- **AWS CloudFront**: Content Delivery Network (CDN) for secure and fast global distribution of the website.

## 📂 Project Structure

```plaintext
logic-escape-room/
├── public/             # Static assets
├── src/
│   ├── components/     # Reusable UI components (e.g., QR Code modal)
│   ├── assets/         # Project images and logo
│   ├── App.tsx         # Main app component
│   └── index.tsx       # App entry point
├── .gitignore          # Files and directories to ignore in Git
├── package.json        # Project dependencies and scripts
└── README.md           # Project documentation
```

## 📦 Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/anye1tovar/logic-escape-room.git
   cd logic-escape-room
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Start the development server**:

   ```bash
   npm run dev
   ```

4. **Build for production**:
   ```bash
   npm run build
   ```

## 🚢 Deployment on AWS

1. **Build the Project**:

   ```bash
   npm run build
   ```

   This command creates a `dist` directory with the production-ready files.

2. **Deploy to AWS S3**:

   - Upload the `dist` folder contents to your S3 bucket.
   - Enable static website hosting.

3. **Set Up CloudFront for HTTPS**:
   - Create a CloudFront distribution for your S3 bucket.
   - Configure HTTPS and adjust settings for optimized cost using the appropriate PriceClass.

## 📜 License

This project is open-source and available under the [MIT License](LICENSE).

## 🤝 Contributing

Feel free to submit pull requests to improve this project. For major changes, please open an issue first to discuss what you’d like to change.

## 📧 Contact

For questions or feedback, please reach out to me on [LinkedIn](https://www.linkedin.com/in/angelica-tovar/).
