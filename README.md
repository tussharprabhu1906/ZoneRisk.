# 🌍 ZoneRisk — Micro-Zonal Climate Risk Mapping System

**ZoneRisk** is a web-based climate risk assessment prototype that analyses a selected location in India and visualises estimated risk across a surrounding 5×5 grid of micro-zones. It combines current weather data, geospatial mapping, a weighted risk-scoring mechanism, AI-generated explanations, and community feedback in a single interactive dashboard.

The goal is to make localised climate-risk information easier to understand through colour-coded maps, environmental indicators, and actionable recommendations.

> **Project status:** Prototype. Some environmental indicators and grid-level variations are simulated. Risk scores and AI-generated recommendations are experimental and should not be used as official forecasts or emergency guidance.

## ✨ Features

- **Flexible location search:** Search by Indian pincode, address, or current GPS location.
- **Weather data integration:** Retrieve current temperature and cloud-cover information through the OpenWeather API.
- **Micro-zonal risk mapping:** Visualise a 5×5 grid of surrounding zones on an interactive map.
- **Colour-coded risk levels:** Identify estimated Low, Moderate, and High Risk zones.
- **AI-generated insights:** Generate plain-English climate-risk summaries and mitigation recommendations using Anthropic Claude, with a fallback when AI generation is unavailable.
- **Community feedback:** Let users report whether the displayed assessment matches their local observations.
- **Adaptive scoring mechanism:** Update shared scoring weights in response to user feedback.
- **Analysis history:** Store and retrieve previous analyses using MongoDB.
- **Risk leaderboard:** Compare areas based on their recorded risk scores.
- **Statistics dashboard:** View aggregate analysis statistics and current scoring weights.
- **Interactive charts:** Explore the distribution of temperatures across grid cells.
- **Dark and light themes:** Switch between visual themes.
- **Backend safeguards:** Apply API rate limiting and temporary result caching.

## 🛠️ Technology Stack

| Component | Technology |
|---|---|
| Frontend | HTML5, CSS3, Bootstrap, JavaScript |
| Interactive maps | Leaflet and OpenStreetMap tiles |
| Charts | Chart.js |
| Backend | Node.js and Express |
| Database | MongoDB and Mongoose |
| Weather data | OpenWeather API |
| AI-generated summaries | Anthropic Claude API |
| Configuration | dotenv |
| Development tools | npm and nodemon |

## 📁 Project Structure

```text
zonerisk/
├── public/
│   └── index.html       # Frontend interface
├── server/
│   ├── index.js         # Express server and database connection
│   ├── routes.js        # API endpoints and analysis logic
│   └── models.js        # MongoDB schemas
├── .env.example         # Environment-variable template
├── .gitignore           # Files excluded from Git
├── package.json         # Dependencies and npm scripts
├── package-lock.json    # Dependency lockfile
└── README.md            # Project documentation
```

## 🚀 Getting Started

### Prerequisites

Install the following before running ZoneRisk:

- [Node.js](https://nodejs.org/) — version 18 or newer.
- [MongoDB Community Server](https://www.mongodb.com/try/download/community), or a MongoDB Atlas database.
- An [OpenWeather API key](https://openweathermap.org/api).
- An [Anthropic API key](https://console.anthropic.com/) for AI-generated summaries. This is optional if the application's fallback mode is available.

### 1. Clone the repository

Replace `<your-username>` with your GitHub username.

```bash
git clone https://github.com/<your-username>/zonerisk.git
cd zonerisk
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy `.env.example` to `.env`.

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

On macOS or Linux:

```bash
cp .env.example .env
```

Open `.env` and configure your credentials:

```env
OPENWEATHER_API_KEY=your_openweather_api_key
MONGODB_URI=mongodb://localhost:27017/zonerisk
PORT=3000
ANTHROPIC_API_KEY=your_anthropic_api_key
```

Use valid credentials for the services you intend to enable. If Anthropic integration is optional in your configuration, the application can use its fallback summary when no AI key is configured.

**Security:** Never commit `.env` or publish API keys. Keep `.env.example` limited to placeholder values and non-secret configuration defaults.

### 4. Start MongoDB

If you installed MongoDB as a Windows service, verify that the MongoDB service is running. You can also connect to your local database using MongoDB Compass with:

```text
mongodb://localhost:27017
```

If you use MongoDB Atlas, replace the local URI in `.env` with your Atlas connection string.

### 5. Start the application

For normal execution:

```bash
npm start
```

For development mode, if the project defines the `dev` script:

```bash
npm run dev
```

When the server and database connect successfully, open:

**http://localhost:3000**

Keep the terminal open while using the application.

## 🗺️ How ZoneRisk Works

The application follows a location-to-analysis workflow.

1. **Location input:** The user provides a pincode, address, or current GPS coordinates.
2. **Geocoding:** The backend converts a location search into geographic coordinates.
3. **Weather retrieval:** The system requests current weather information from OpenWeather.
4. **Environmental modelling:** Available weather information is combined with additional environmental indicators. Some indicators are simulated in the current prototype.
5. **Grid generation:** The system creates a 5×5 grid around the selected location.
6. **Risk computation:** A weighted scoring mechanism estimates risk and assigns a category to each grid cell.
7. **AI explanation:** When configured and available, Claude generates a natural-language explanation and recommendations based on the analysis supplied to it.
8. **Database storage:** Analysis results and relevant feedback are stored in MongoDB.
9. **Community feedback:** Users report discrepancies between the displayed assessment and their observations. The feedback mechanism adjusts shared scoring weights for subsequent analyses.

### System workflow

```text
Location Input
      |
      v
Geocoding and Weather Retrieval
      |
      v
Environmental Data and Modelling
      |
      v
5 × 5 Micro-Zonal Grid Generation
      |
      v
Weighted Risk Scoring
      |
      v
Map, Charts and AI Recommendations
      |
      v
MongoDB Storage and User Feedback
      |
      v
Adaptive Weight Adjustment
```

## 🧠 AI and Adaptive Scoring

ZoneRisk combines two distinct capabilities.

**1. AI-generated explanations**

The application can use Anthropic Claude to convert analysis results into a readable risk summary and practical recommendations. If AI generation is unavailable, the application can provide a predefined fallback summary, depending on its configuration.

**2. Feedback-driven adaptive scoring**

The application stores scoring weights in MongoDB and adjusts them in response to user feedback. These updated weights can affect subsequent risk calculations.

The current mechanism is a basic adaptive weighted model, not a fully trained or independently validated machine-learning model. User feedback indicates perceived agreement with an assessment; it does not, by itself, establish scientific correctness.

## 🌦️ Environmental Data and Limitations

The current prototype uses a combination of retrieved and simulated values.

| Indicator | Current implementation |
|---|---|
| Temperature | Retrieved from current weather data |
| Cloud cover | Retrieved from current weather data; not equivalent to rainfall |
| Air Quality Index (AQI) | Simulated in the current implementation |
| Elevation | Simulated in the current implementation |
| Urban density | Simulated in the current implementation |
| Grid-level temperatures | Simulated estimates rather than independent measurements for every grid cell |
| Climate risk score | Calculated using the implemented weighted scoring mechanism |

The current application should be treated as an experimental risk-visualisation tool. It does not yet establish validated long-term climate trends, official disaster probabilities, or scientifically verified neighbourhood-level risk predictions.

Improving the quality of the results would require reliable historical climate records, measured or authoritative environmental datasets, appropriate spatial modelling, and validation against observed conditions.

## 🔌 API Endpoints

The backend exposes the following endpoints:

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/geocode` | Convert a location query into coordinates |
| `POST` | `/api/analyze` | Perform a risk analysis and generate grid results |
| `POST` | `/api/feedback` | Record feedback and adjust scoring weights |
| `GET` | `/api/history` | Retrieve recent analyses |
| `GET` | `/api/leaderboard` | Retrieve the highest recorded risk scores |
| `GET` | `/api/stats` | Retrieve aggregate statistics and scoring weights |
| `DELETE` | `/api/clear-history` | Delete stored analysis history |

The exact request and response formats are defined in `server/routes.js`.

> **Deployment warning:** The history-clearing endpoint should be protected by authentication or administrator authorisation before exposing the application publicly. The same applies to other sensitive operations.

## 🗄️ Database Design

ZoneRisk uses MongoDB with Mongoose schemas.

- **Analysis:** Stores location details, environmental indicators, scores, risk categories, and timestamps.
- **Feedback:** Stores user responses associated with analyses and records relevant weight changes.
- **Weight:** Stores shared adaptive scoring parameters used by the risk calculation.

The database URI is configured through `MONGODB_URI` in `.env`.

## 🔐 Security Considerations

- Store API keys in environment variables.
- Keep `.env` out of version control.
- Use `.env.example` to document required configuration without exposing secrets.
- Retain dependency lockfiles to improve reproducibility.
- Restrict access to destructive database operations.
- Validate and sanitise user input and safely render user-controlled content.
- Configure appropriate CORS restrictions before deployment.
- Review dependencies for known vulnerabilities before release.

## 🧪 Troubleshooting

**Error: `Cannot find module 'dotenv'`**

Run:

```bash
npm install
```

If the package is still missing:

```bash
npm install dotenv
```

**Error: MongoDB URI is undefined**

Check that `.env` exists in the project root, contains `MONGODB_URI`, and is loaded before the database connection is attempted. On Windows, verify that the file is not accidentally named `.env.txt`.

**Error: MongoDB connection refused**

Start MongoDB Community Server or verify your MongoDB Atlas URI and network access settings.

**Error: Weather or AI data is unavailable**

Check your API key, service access, network connection, and usage limits. Confirm that the backend returns a useful error or fallback response rather than leaving the interface stuck on a loading screen.

## 🔮 Future Improvements

Potential future development includes:

- Integrating authoritative elevation, AQI, rainfall, and historical climate datasets.
- Replacing simulated grid values with spatially resolved environmental measurements or validated estimates.
- Developing and evaluating a properly trained climate-risk prediction model.
- Improving feedback learning with validation data, safeguards, and measurable performance metrics.
- Adding time-series climate trends and historical comparisons.
- Improving model explainability and uncertainty estimates.
- Introducing authentication and role-based access control.
- Deploying the application with a production database and secure server-side configuration.

## 📄 License

This project is intended to be released under the MIT License. See the `LICENSE` file for the complete license text.

If the repository does not yet contain a `LICENSE` file, add the MIT license text before describing the project as officially licensed under MIT.

## 👥 Contributing

Contributions, suggestions, and bug reports are welcome. For significant changes, open an issue first to discuss the proposed improvement.

Please ensure that API keys, database credentials, and other private configuration values are not included in issues, pull requests, or commits.
