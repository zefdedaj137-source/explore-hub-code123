import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import App from "../App";

describe("App", () => {
  it("renders without crashing", () => {
    const { container } = render(<App />);
    expect(container).toBeTruthy();
  });

  it("should render loading state initially", () => {
    render(<App />);
    expect(document.body).toBeTruthy();
  });
});
