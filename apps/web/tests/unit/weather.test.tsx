import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LiveWeatherForecast } from "@/components/weather/LiveWeatherForecast";
import WeatherPage from "@/app/weather/page";

// Mock router
vi.mock("next/navigation", () => ({
  usePathname: () => "/weather",
  useRouter: () => ({ push: vi.fn() }),
}));

describe("Live Weather & 7-Day Forecasting Telemetry", () => {
  it("renders LiveWeatherForecast with live metrics, alert banner, and Doppler radar status", () => {
    render(<LiveWeatherForecast />);

    // Check Live header
    expect(screen.getByText(/IMD LIVE DOPPLER & REGIONAL WEATHER RADAR/i)).toBeDefined();
    expect(screen.getByText(/Live Weather & 7-Day Forecast/i)).toBeDefined();

    // Check Live Temperature & Condition
    const tempMatches = screen.getAllByText(/22.4°C/i);
    expect(tempMatches.length).toBeGreaterThan(0);
    expect(screen.getByText(/Heavy Monsoon Downpour/i)).toBeDefined();

    // Check Live Metric Cards
    expect(screen.getByText(/24h Rainfall/i)).toBeDefined();
    expect(screen.getByText(/114.5/i)).toBeDefined();
    expect(screen.getByText(/Precip Rate/i)).toBeDefined();
    expect(screen.getByText(/14.8/i)).toBeDefined();
    expect(screen.getByText(/Soil Saturation/i)).toBeDefined();
    expect(screen.getByText(/82.4%/i)).toBeDefined();

    // Check Alert Banner
    expect(screen.getByText(/IMD RED ALERT/i)).toBeDefined();
    expect(screen.getByText(/Red Alert: Severe Rainfall & Active Slope Saturated/i)).toBeDefined();
  });

  it("renders all 8 Northeast states in the region selector bar and regional matrix", () => {
    render(<LiveWeatherForecast />);

    // Check Northeast Region State Selector Heading
    expect(screen.getByText(/North East Region State Selector/i)).toBeDefined();

    // Check All 8 States Tabs + All Northeast
    const states = [
      "All Northeast",
      "Mizoram",
      "Sikkim",
      "Assam",
      "Meghalaya",
      "Arunachal Pradesh",
      "Nagaland",
      "Manipur",
      "Tripura",
    ];

    states.forEach((st) => {
      const buttons = screen.getAllByRole("button", { name: new RegExp(st, "i") });
      expect(buttons.length).toBeGreaterThan(0);
    });

    // Check Regional Synopsis Matrix
    expect(screen.getByText(/All North East Region Synoptic Matrix/i)).toBeDefined();
    expect(screen.getByText(/Situational Overview Across All 8 Northeast States/i)).toBeDefined();
  });

  it("allows filtering and switching across Northeast states (Assam, Meghalaya, Sikkim)", () => {
    render(<LiveWeatherForecast />);

    // Switch to Assam
    const assamTab = screen.getByRole("button", { name: /Filter by Assam/i });
    fireEvent.click(assamTab);

    // Station should update to Dima Hasao & Jatinga Chute / NH-27
    const assamMatches = screen.getAllByText(/Dima Hasao & Jatinga Chute/i);
    expect(assamMatches.length).toBeGreaterThan(0);
    expect(screen.getByText(/Alt: 615m MSL/i)).toBeDefined();

    // Switch to Meghalaya
    const meghalayaTab = screen.getByRole("button", { name: /Filter by Meghalaya/i });
    fireEvent.click(meghalayaTab);

    // Station should update to Shillong & Sonapur Tunnel / NH-6
    const shillongMatches = screen.getAllByText(/Shillong & Sonapur Tunnel/i);
    expect(shillongMatches.length).toBeGreaterThan(0);
    expect(screen.getByText(/165.2/i)).toBeDefined(); // Meghalaya 24h rainfall
  });

  it("renders the Next Day Operational Spotlight with hourly rain distribution", () => {
    render(<LiveWeatherForecast />);

    // Check Next Day Banner
    expect(screen.getByText(/NEXT DAY OPERATIONAL SPOTLIGHT/i)).toBeDefined();
    expect(screen.getByText(/Tomorrow's Forecast & Immediate Landslide Threat/i)).toBeDefined();

    // Check expected rain & hours
    expect(screen.getByText(/Expected 24h Rain/i)).toBeDefined();
    const rainMatches = screen.getAllByText(/96.0/i);
    expect(rainMatches.length).toBeGreaterThan(0);
    expect(screen.getByText(/Tomorrow's Hourly Rain Distribution/i)).toBeDefined();
    expect(screen.getAllByText("00:00").length).toBeGreaterThan(0);
    expect(screen.getAllByText("04:00").length).toBeGreaterThan(0);
    expect(screen.getAllByText("08:00").length).toBeGreaterThan(0);
    expect(screen.getAllByText("12:00").length).toBeGreaterThan(0);
  });

  it("renders all 7 days in the synoptic forecast matrix and allows selecting a day", () => {
    render(<LiveWeatherForecast />);

    expect(screen.getByText(/7-Day Synoptic Weather Outlook/i)).toBeDefined();
    expect(screen.getByText(/Total 7-Day Expected Rain/i)).toBeDefined();

    // Check Day 1 (Tomorrow) card is present
    expect(screen.getByRole("button", { name: /Tomorrow/i })).toBeDefined();

    // Check detailed outlook drawer
    expect(screen.getByText(/Detailed Outlook for/i)).toBeDefined();
    expect(screen.getByText(/6-Hour Synoptic Interval Breakdown/i)).toBeDefined();

    // Click on a forecast day card to change selection
    const dayButtons = screen.getAllByRole("button", { pressed: false });
    expect(dayButtons.length).toBeGreaterThan(0);
    fireEvent.click(dayButtons[0]);

    // Check that selection updated
    expect(screen.getByText(/Corridor Safety Directive/i)).toBeDefined();
  });

  it("allows switching weather stations to Sikkim (Gangtok NH-10)", () => {
    render(<LiveWeatherForecast />);

    const selector = screen.getByLabelText(/Select Weather Station/i);
    fireEvent.change(selector, { target: { value: "gangtok-nh10" } });

    // Verify station updated to Gangtok
    const gangtokMatches = screen.getAllByText(/Gangtok & Teesta Chute/i);
    expect(gangtokMatches.length).toBeGreaterThan(0);
    expect(screen.getByText(/Alt: 1650m MSL/i)).toBeDefined();
    expect(screen.getByText(/142.8/i)).toBeDefined(); // Gangtok 24h rainfall
    expect(screen.getByText(/Teesta Valley Chute Failure Risk/i)).toBeDefined();
  });

  it("renders the dedicated WeatherPage with breadcrumb and SOP guidelines", () => {
    render(<WeatherPage />);

    expect(screen.getByText("Command Center")).toBeDefined();
    expect(screen.getByText("Live Weather & 7-Day Updates")).toBeDefined();
    expect(screen.getByText("Doppler Weather Radar Integration")).toBeDefined();
    expect(screen.getByText("Next-Day Rainfall Thresholds")).toBeDefined();
    expect(screen.getByText("Multi-Model 7-Day Ensemble")).toBeDefined();
  });
});

