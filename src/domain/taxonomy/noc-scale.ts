import { ValidationError } from '../shared/errors';

export const NOC_SCALE_MIN = 1;
export const NOC_SCALE_MAX = 5;
const SCALE_MIN = NOC_SCALE_MIN;
const SCALE_MAX = NOC_SCALE_MAX;

/** Rótulos das 5 âncoras da escala NOC, na ordem 1→5 (gravemente comprometido → não comprometido). */
export type NocScaleAnchors = readonly [string, string, string, string, string];

/** Escala Likert 1–5 de um resultado NOC — cada resultado referencia a sua própria escala. */
export class NocScale {
  private constructor(private readonly state: NocScaleAnchors) {}

  static create(anchors: NocScaleAnchors): NocScale {
    if (anchors.length !== SCALE_MAX) {
      throw new ValidationError(
        `Escala NOC deve ter exatamente ${SCALE_MAX} âncoras`,
      );
    }
    const trimmed = anchors.map((label) => label.trim());
    if (trimmed.some((label) => label.length === 0)) {
      throw new ValidationError('Toda âncora da escala NOC precisa de rótulo');
    }
    return new NocScale(trimmed as unknown as NocScaleAnchors);
  }

  static restore(anchors: NocScaleAnchors): NocScale {
    return new NocScale(anchors);
  }

  labelFor(score: number): string {
    if (!Number.isInteger(score) || score < SCALE_MIN || score > SCALE_MAX) {
      throw new ValidationError(
        `Pontuação NOC deve ser um inteiro entre ${SCALE_MIN} e ${SCALE_MAX}`,
      );
    }
    return this.state[score - 1];
  }

  get anchors(): NocScaleAnchors {
    return this.state;
  }
}
