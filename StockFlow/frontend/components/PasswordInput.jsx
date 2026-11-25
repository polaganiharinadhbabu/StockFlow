"use client";
import { useState } from "react";

// A password box with a Show / Hide button, so people can see what they typed.
export default function PasswordInput(props) {
  const [show, setShow] = useState(false);
  return (
    <div className="pw">
      <input {...props} type={show ? "text" : "password"} />
      <button type="button" className="pw-toggle" onClick={() => setShow(!show)}>{show ? "Hide" : "Show"}</button>
    </div>
  );
}
