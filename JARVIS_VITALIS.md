# VITALIS

## Team

- **Team name:** JARVIS
- **Members and GitHub usernames:**
  - Malluri Vikas — [mallurivikas](https://github.com/mallurivikas)
  - Sai Sidhardh Nimishakavi — [sidnim12](https://github.com/sidnim12)
  - Numair Khan — [NumairAITokens404](https://github.com/NumairAITokens404)

## Challenge

- [✅] Best Open-Source AI Project
- [✅] Best Use of Gemma 4
- [ ] Build on elah

## Project links

- **Public GitHub repository:** [https://github.com/mallurivikas/Hacktoberfest26](https://github.com/mallurivikas/Hacktoberfest26)
- **Open-source license:** MIT License — `LICENSE`

## Problem and solution

### Who is this for?

Vitalis is designed for individuals who want a convenient, personalized way to understand their health risks and make more informed health and lifestyle decisions. It can also help users interpret supported medical images and evaluate food products based on their personal health profile.

### What problem does it solve?

Health information is often fragmented across different tools. Disease-risk predictions, medical-image analysis, nutritional information, and general health advice typically require separate systems and are not necessarily interpreted together.

Vitalis brings these capabilities into a single platform by combining multiple disease-specific ML models, medical-image analysis, food-label understanding, and generative AI. Instead of presenting isolated predictions or generic nutritional information, the system uses the user's health profile and model outputs to generate contextualized health insights.

### Main input → output workflow

**Health and lifestyle data**\
→ Disease-specific ML models\
→ Individual disease-risk scores\
→ Aggregate health assessment\
→ **Overall health score + personalized health summary**

**Medical image**\
→ AI-assisted medical-image analysis\
→ **Image findings and interpretation**

**Food-label image**\
→ OCR / vision-based extraction of nutritional and ingredient information\
→ Combine extracted information with the user's health profile and disease-risk results\
→ **Personalized food assessment and relevant health considerations**

The final output is a consolidated view of the user's **disease risks, overall health assessment, medical-image insights, and personalized food recommendations.**

## Approach and technologies

Vitalis uses a modular AI/ML architecture where different models handle different parts of the health-assessment pipeline.

- **Disease prediction:** Separate ML models are trained for individual diseases using the health and lifestyle features required by each model. Their outputs are converted into disease-specific risk scores.
- **Health aggregation:** Individual predictions are combined to produce an overall health assessment and provide context for the generative AI layer.
- **Generative AI:** The user's structured health information, disease-risk results, and other AI-generated findings are provided as context to generate a consolidated and personalized health summary.
- **Medical-image analysis:** Users can upload supported medical images such as X-rays for AI-assisted analysis and interpretation.
- **Food-label analysis:** Images containing nutritional or ingredient labels are processed to extract relevant information. This information is then evaluated alongside the user's health profile and predicted risks.
- **Multimodal workflow:** The platform combines structured numerical/categorical health data with visual inputs such as medical images and food-label images.
- **Open-source AI:** The project uses open-source/open-weight AI and ML components where applicable, allowing the implementation to be inspected and extended.
- **Generative AI integration:** Gemma 4 is used as part of the generative AI workflow to reason over the user's health context and produce the final personalized output.

All third-party libraries, models, datasets, and other reused components are credited in the repository where applicable.

## Challenge evidence

### Best Open-Source AI Project

- **Open-source/open-weight AI component and its role:**\
  Vitalis integrates open-source/open-weight ML and AI components for disease-risk prediction, medical-image analysis, food-label understanding, and generative health summarization. These components form the core AI pipeline of the application.

- **Code link showing the integration:**\
  [https://github.com/mallurivikas/Hacktoberfest26](https://github.com/mallurivikas/Hacktoberfest26)

  Relevant model and AI integration code is available in the project repository.

- **Agent Skill Open Standard compliance (if applicable):**\
  Not applicable.

- **Original harness implementation or meaningful changes (if applicable):**\
  The team implemented the end-to-end Vitalis application that connects multiple disease-specific prediction models, multimodal image processing, user health data, and generative AI into a unified workflow. The integration layer, health-score aggregation, personalized context construction, and application workflow were developed as part of this project.

### Best Use of Gemma 4

- **Gemma 4 model identifier and Gemini API integration:**\
  **Gemma 4:** `[INSERT EXACT GEMMA 4 MODEL IDENTIFIER USED]`

  Gemma 4 is integrated into the Vitalis generative-AI layer. It receives relevant user health information and outputs from the prediction and multimodal analysis pipelines and generates a consolidated, personalized health summary and contextual recommendations.

- **Code link showing the integration:**\
  [https://github.com/mallurivikas/Hacktoberfest26](https://github.com/mallurivikas/Hacktoberfest26)

  **Direct integration file:** `[INSERT PATH TO GEMMA 4 INTEGRATION FILE]`

- **Input and useful output; multimodal value where applicable:**\
  **Inputs:** User health and lifestyle parameters, disease-specific risk scores, overall health assessment, and relevant information extracted from uploaded medical/food images.

  **Outputs:** Personalized health summaries, contextual explanations of predicted risks, and food-related health considerations based on the user's individual profile.

  The multimodal pipeline allows information obtained from images to be combined with structured health data before being passed into the generative AI layer, rather than treating image analysis and health assessment as completely separate workflows.

## Current status

### What works

- User health and lifestyle data collection.
- Disease-specific ML prediction pipeline.
- Individual disease-risk scores.
- Overall/aggregate health assessment.
- AI-generated personalized health summary.
- Medical-image upload and AI-assisted analysis for supported image types.
- Food-label image upload and extraction of nutritional/ingredient information.
- Contextual food assessment using the user's health profile and predicted risks.
- Gemma 4 integration for the generative AI layer.
- Unified web-based workflow connecting the different AI components.

### Known limitations / incomplete features

- Medical-image analysis is intended as AI-assisted interpretation and is not a replacement for professional medical diagnosis.
- Prediction quality depends on the datasets and models used for each disease.
- Supported medical-image types and the accuracy of their interpretation are currently limited by the implemented models.
- OCR/vision-based extraction from food labels can be affected by image quality, lighting, text layout, and language.
- The overall health score is an aggregate representation of model outputs and should not be interpreted as a clinical diagnosis or standardized medical score.
- The system requires further validation on larger and more diverse datasets before being used for real-world clinical decision-making.

### What we would improve next

- Add more validated disease-specific models.
- Improve calibration and validation of individual risk predictions.
- Expand support for additional medical-image modalities.
- Improve food-label extraction for different languages and label formats.
- Add stronger uncertainty and confidence reporting for AI-generated results.
- Improve model monitoring, evaluation, and bias analysis.
- Add longitudinal health tracking so users can monitor changes in their risk profile over time.
- Further optimize the multimodal pipeline for faster inference and deployment.

## Submission checklist

- [x] Project repository is public and links work.
- [x] Required challenge evidence is included.
- [x] Project uses the MIT open-source license.
- [x] Work and reused materials are represented honestly.
- [x] No API keys, tokens, passwords, or private data are included.
- [x] I followed the organizers' build window and submission instructions.
