import { Service, Container } from 'typedi';
import axios from 'axios';
import { CustomException, InvalidPayloadException } from '@/utils/exception';

interface GoogleUserResult {
    id: string;
    email: string;
    verified_email: boolean;
    name: string;
    given_name: string;
    family_name: string;
    picture: string;
    locale: string;
}

enum AuthProvider {
    GOOGLE = 'google'
}

@Service()
export class OAuthService {

  private verifyGoogleUser = async (accessToken: string): Promise<GoogleUserResult> => {
    try {
      if (!accessToken) throw new InvalidPayloadException('access token is required');
      const response = await axios.get('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 10_000,
      });
      return response.data;
    } catch (error) {
      if (error?.response?.status && error?.response?.status === 401) {
        throw new CustomException(401, 'ACCESS_TOKEN', 'accessToken was expired');
      }
      throw error;
    }
  };

}
