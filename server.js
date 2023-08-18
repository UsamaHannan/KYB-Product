const express = require("express");
const axios = require("axios");
const mongoose = require("mongoose");

const cors = require("cors");

const app = express();
const port = 3000;

// Use CORS middleware
app.use(cors());
// Connect to MongoDB database
//Mongo db local host: 127.0.0.1
mongoose
  .connect("mongodb://127.0.0.1:27017/companies-house-api", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB database"))
  .catch((error) =>
    console.error(`Error connecting to MongoDB database: ${error.message}`)
  );

// Define schema for company data
const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    number: { type: String, required: true },
    address: {
      street: String,
      locality: String,
      region: String,
      postalCode: String,
    },
    status: String,
    type: String,
  },
  { timestamps: true }
);
// Remove the unique index on the number field
companySchema.index({ number: 1 }, { unique: false });

// Create model for company data
const Company = mongoose.model("Company", companySchema);

// Use JSON parser middleware for incoming requests
app.use(express.json());

// Define endpoint for POST API
// Define endpoint for POST search API
app.post("/companies", async (req, res) => {
  try {
    // Get search term from request body
    const searchTerm = req.body.searchTerm;

    if (!searchTerm) {
      return res.status(400).json({ message: "Missing required search term" });
    }

    // Set up authorization header with Companies House API key
    const apiKey = "8a3ec19d-fe95-4a24-8d4c-59d4600aacb6";

    if (!apiKey) {
      return res.status(500).json({ message: "Missing API key" });
    }

    const authHeader = {
      Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
    };

    // Send request to Companies House API to search for companies
    const searchResponse = await axios.get(
      `https://api.company-information.service.gov.uk/search?q=${searchTerm}`,
      { headers: authHeader }
    );

    // Get array of company numbers from search response
    const companyNumbers = searchResponse.data.items.map(
      (item) => item.company_number
    );

    if (companyNumbers.length === 0) {
      return res.status(404).json({ message: "No companies found" });
    }

    // Use array of company numbers to send requests to Companies House API for company data
    const companyResponses = await Promise.all(
      companyNumbers.map((companyNumber) =>
        axios.get(
          `https://api.company-information.service.gov.uk/company/${companyNumber}`,
          {
            headers: authHeader,
          }
        )
      )
    );

    // Parse company data from responses and return as JSON
    const companies = companyResponses.map((response) => {
      const data = response.data;
      return {
        name: data.company_name,
        number: data.company_number,
        address: {
          street: data.registered_office_address?.address_line_1,
          locality: data.registered_office_address?.locality,
          region: data.registered_office_address?.region,
          postalCode: data.registered_office_address?.postal_code,
        },
        status: data.company_status,
        type: data.type,
      };
    });

    res
      .status(200)
      .json({ message: "Companies retrieved successfully", data: companies });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error retrieving companies" });
  }
});

app.get("/companies/:number", async (req, res) => {
  try {
    // Get company number from request parameters
    const companyNumber = req.params.number;

    if (!companyNumber) {
      return res
        .status(400)
        .json({ message: "Missing required company number" });
    }

    // Set up authorization header with Companies House API key
    const apiKey = "8a3ec19d-fe95-4a24-8d4c-59d4600aacb6";

    if (!apiKey) {
      return res.status(500).json({ message: "Missing API key" });
    }

    const authHeader = {
      Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
    };

    // Send request to Companies House API to get company data
    const companyResponse = await axios.get(
      `https://api.company-information.service.gov.uk/company/${companyNumber}`,
      { headers: authHeader }
    );

    // Parse company data from response
    const data = companyResponse.data;
    const company = {
      name: data.company_name,
      number: data.company_number,
      company_status_detail: data.company_status_detail,
      confirmation_statement: data.confirmation_statement,
      date_of_cessation: data.date_of_cessation,
      date_of_creation: data.date_of_creation,
      foreign_company_details: data.foreign_company_details,
      company_type: data.company_type,
      business_activity: data.business_activity,
      originating_registry: data.originating_registry,
      registration_number: data.registration_number,
      registered_office_address: data.registered_office_address,
      sic_codes: data.sic_codes,
      service_address: data.service_address,
      governed_by: data.governed_by,

      status: data.company_status,
      type: data.type,
      jurisdiction: data.jurisdiction,
      accounts: data.accounts,
      annual_return: data.annual_return,
      branch_company_details: data.branch_company_details,
    };

    // Save company data to MongoDB database
    await Company.updateOne({ number: company.number }, company, {
      upsert: true,
    });

    res
      .status(200)
      .json({
        message: "Company data retrieved and saved successfully",
        data: company,
      });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error retrieving and saving company data" });
  }
});

// Define endpoint for retrieving officers of a company
app.get("/companies/:number/officers", async (req, res) => {
  try {
    // Get company number from request parameters
    const companyNumber = req.params.number;

    if (!companyNumber) {
      return res
        .status(400)
        .json({ message: "Missing required company number" });
    }

    // Set up authorization header with Companies House API key
    const apiKey = "8a3ec19d-fe95-4a24-8d4c-59d4600aacb6";

    if (!apiKey) {
      return res.status(500).json({ message: "Missing API key" });
    }

    const authHeader = {
      Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
    };

    // Send request to Companies House API to retrieve officers of a company
    const officersResponse = await axios.get(
      `https://api.company-information.service.gov.uk/company/${companyNumber}/officers`,
      { headers: authHeader }
    );

    res.status(200).json({
      message: "Officers retrieved successfully",
      data: officersResponse.data,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error retrieving officers" });
  }
});

// Define endpoint for retrieving officers of a company
app.get("/companies/:number/filing-history", async (req, res) => {
  try {
    // Get company number from request parameters
    const companyNumber = req.params.number;

    if (!companyNumber) {
      return res
        .status(400)
        .json({ message: "Missing required company number" });
    }

    // Set up authorization header with Companies House API key
    const apiKey = "8a3ec19d-fe95-4a24-8d4c-59d4600aacb6";

    if (!apiKey) {
      return res.status(500).json({ message: "Missing API key" });
    }

    const authHeader = {
      Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
    };

    // Send request to Companies House API to retrieve officers of a company
    const FilingResponse = await axios.get(
      `https://api.company-information.service.gov.uk/company/${companyNumber}/filing-history`,
      { headers: authHeader }
    );

    res.status(200).json({
      message: "Officers retrieved successfully",
      data: FilingResponse.data,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error retrieving officers" });
  }
});

// Define endpoint for root URL
app.get("/", (req, res) => {
  res.send("Hello World!");
});
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
