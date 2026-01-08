import { Box, Grid, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import "./About.scss";
import noxImage from "../../../assets/img/nox-complete.png";

const About = () => {
  const { t } = useTranslation();

  const titleLines = t("about.titleLines", {
    returnObjects: true,
  }) as string[];
  const hasTitleLines =
    Array.isArray(titleLines) && titleLines.filter(Boolean).length > 0;

  const sections = t("about.sections", { returnObjects: true }) as Array<{
    title: string;
    body: string;
  }>;

  return (
    <section className="about" id="about">
      <Box className="about__container">
        <Typography component="h2" variant="h4" className="about__title">
          {hasTitleLines
            ? titleLines.map((line, idx) => (
                <span
                  key={`${line}-${idx}`}
                  className={`about__title-line ${
                    idx === titleLines.length - 1
                      ? "about__title-line--highlight"
                      : ""
                  }`}
                >
                  {line}
                </span>
              ))
            : t("about.title")}
        </Typography>

        <Grid container spacing={4} alignItems="center" className="about__row">
          <Grid item xs={12} md={5}>
            <Box className="about__image-wrapper">
              <Box
                component="img"
                src={noxImage}
                alt="Nox, mascota de Logic Escape Room"
                className="about__image"
              />
            </Box>
          </Grid>
          <Grid item xs={12} md={7}>
            {sections.map((section) => (
              <>
                <Typography component="h6" variant="h6">
                  {section.title}
                </Typography>
                <p style={{ paddingBottom: "16px" }}>{section.body}</p>
              </>
            ))}
          </Grid>
        </Grid>
      </Box>
    </section>
  );
};

export default About;
