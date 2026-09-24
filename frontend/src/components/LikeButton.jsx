import { useNavigate } from 'react-router-dom';
import Icon from './Icons';
import { useAuth } from '../context/AuthContext';
import { useLibrary } from '../context/LibraryContext';
import { useToast } from './Toast';
import { errorText } from '../api';

export default function LikeButton({ song, className = '' }) {
  const { user } = useAuth();
  const { isLiked, toggleLike } = useLibrary();
  const toast = useToast();
  const navigate = useNavigate();
  const liked = isLiked(song);

  async function onClick(e) {
    e.stopPropagation();
    if (!user) return navigate('/login');
    try {
      await toggleLike(song);
      toast(liked ? 'Removed from Liked Songs' : 'Added to Liked Songs');
    } catch (err) {
      toast(errorText(err));
    }
  }

  return (
    <button
      className={`icon-btn like ${liked ? 'on' : ''} ${className}`}
      aria-label={liked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
      aria-pressed={liked}
      onClick={onClick}
    >
      <Icon name={liked ? 'heart' : 'heartOutline'} />
    </button>
  );
}
