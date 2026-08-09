"use client";

import { FormEvent, useState } from "react";

type FormState = "idle" | "sending" | "success" | "error";

export function InquiryForm() {
  const [state, setState] = useState<FormState>("idle");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("sending");
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    try {
      const response = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Submission failed");
      form.reset();
      setState("success");
    } catch {
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <div className="form-success" role="status">
        <span aria-hidden="true">✺</span>
        <h3>Your project is headed our way.</h3>
        <p>Thank you. We&apos;ll be in touch to learn more about the space.</p>
        <button type="button" onClick={() => setState("idle")}>Send another note</button>
      </div>
    );
  }

  return (
    <form className="inquiry-form" onSubmit={submit}>
      <div className="form-row">
        <label>First name<input name="firstName" autoComplete="given-name" required maxLength={80} /></label>
        <label>Last name<input name="lastName" autoComplete="family-name" required maxLength={80} /></label>
      </div>
      <div className="form-row">
        <label>Email<input name="email" type="email" autoComplete="email" required maxLength={160} /></label>
        <label>Phone <small>optional</small><input name="phone" type="tel" autoComplete="tel" maxLength={40} /></label>
      </div>
      <label>Project location<input name="location" autoComplete="street-address" placeholder="City or address" required maxLength={200} /></label>
      <div className="form-row">
        <label>Approximate size<input name="size" placeholder="e.g. 1,500 sq. ft." maxLength={80} /></label>
        <label>What can we help with?
          <select name="service" defaultValue="">
            <option value="" disabled>Choose a service</option>
            <option>Not sure yet</option><option>On-site consultation</option><option>Native landscape design + installation</option><option>Prairie or wildflower plot</option>
          </select>
        </label>
      </div>
      <label>Tell us about the space<textarea name="message" rows={5} placeholder="What is there now? How much sun does it get? What would you love to see here?" required maxLength={2000} /></label>
      <label className="honeypot" aria-hidden="true">Company website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      <div className="form-submit">
        <button className="button button-sun" type="submit" disabled={state === "sending"}>{state === "sending" ? "Sending…" : "Request an estimate ↗"}</button>
        <p>By submitting, you&apos;re asking Perfect Prairie to contact you about this project.</p>
      </div>
      {state === "error" && <p className="form-error" role="alert">We couldn&apos;t send your request just now. Please try again, or email <a href="mailto:contact@perfectprairie.com">contact@perfectprairie.com</a>.</p>}
    </form>
  );
}
