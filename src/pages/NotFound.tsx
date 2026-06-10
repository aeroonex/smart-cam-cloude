import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="nf_wrapper">
        <div className="nf_main">
          <div className="nf_antenna">
            <div className="nf_antenna_shadow"></div>
            <div className="nf_a1"></div>
            <div className="nf_a1d"></div>
            <div className="nf_a2"></div>
            <div className="nf_a2d"></div>
          </div>
          <div className="nf_tv">
            <div className="nf_cruve">
              <svg className="nf_curve_svg" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 189.929 189.929">
                <path d="M70.343,70.343c-30.554,30.553-44.806,72.7-39.102,115.635l-29.738,3.951C-5.442,137.659,11.917,86.34,49.129,49.13C86.34,11.918,137.664-5.445,189.928,1.502l-3.95,29.738C143.041,25.54,100.895,39.789,70.343,70.343z" />
              </svg>
            </div>
            <div className="nf_display_div">
              <div className="nf_screen_out">
                <div className="nf_screen_out1">
                  <div className="nf_screen">
                    <span className="nf_notfound_text">NOT FOUND</span>
                  </div>
                  <div className="nf_screenM">
                    <span className="nf_notfound_text">NOT FOUND</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="nf_lines">
              <div className="nf_line1"></div>
              <div className="nf_line2"></div>
              <div className="nf_line3"></div>
            </div>
            <div className="nf_buttons_div">
              <div className="nf_b1"><div></div></div>
              <div className="nf_b2"></div>
              <div className="nf_speakers">
                <div className="nf_g1">
                  <div className="nf_g11"></div>
                  <div className="nf_g12"></div>
                  <div className="nf_g13"></div>
                </div>
                <div className="nf_g"></div>
                <div className="nf_g"></div>
              </div>
            </div>
          </div>
          <div className="nf_bottom">
            <div className="nf_base1"></div>
            <div className="nf_base2"></div>
            <div className="nf_base3"></div>
          </div>
        </div>
        <div className="nf_text_404">
          <div className="nf_text_4041">4</div>
          <div className="nf_text_4042">0</div>
          <div className="nf_text_4043">4</div>
        </div>
      </div>

      <div className="mt-4 text-center">
        <p className="text-neutral-500 text-sm mb-3">
          Bu sahifa mavjud emas
        </p>
        <button
          onClick={() => navigate("/")}
          className="rounded-full bg-[#1d4f8a] px-6 py-2 text-sm font-semibold text-white hover:bg-[#d36604] transition"
        >
          Bosh sahifaga qaytish
        </button>
      </div>
    </div>
  );
};

export default NotFound;
