import { Eye, EyeOff } from 'lucide-react';

const TogglePasswordVisibility = ({
  isPasswordVisible,
  handlePasswordVisibility,
}) => {
  return (
    <button
      onClick={handlePasswordVisibility}
      className="flex pointer items-center text-white absolute right-3 top-[50px]"
      type="button"
    >
      {!isPasswordVisible ? (
        <Eye className="h-6 w-4 text-primary" />
      ) : (
        <EyeOff className="h-6 w-4 text-primary" />
      )}
    </button>
  );
};

export default TogglePasswordVisibility;
