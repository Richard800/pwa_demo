import Vector from "../utils/vector";
import Euler from "../utils/euler";
import { clamp } from "../utils/helpers";
import { RIGHT, LEFT } from "./../constants";
import { PI } from "./../constants";
export const offsets = {
    lowerBody: {
        z: 0.1,
    },
};
/**
 * Calculates leg rotation angles
 * @param {Results} lm : array of 3D pose vectors from tfjs or mediapipe
 */
export const calcBody = (lm) => {
    const shoulderLeft2d = Vector.fromArray(lm[11]);
    const shoulderRight2d = Vector.fromArray(lm[12]);
    const hipLeft2d = Vector.fromArray(lm[23]);
    const hipRight2d = Vector.fromArray(lm[24]);
    const kneeLeft2d = Vector.fromArray(lm[25]);
    const kneeRight2d = Vector.fromArray(lm[26]);

    const shoulderCenter2d = shoulderLeft2d.lerp(shoulderRight2d, 1);
    const hipCenter2d = hipLeft2d.lerp(hipRight2d, 1);
    const kneeCenter2d = kneeLeft2d.lerp(kneeRight2d, 1);

    const lowerBodySphericalCoords = Vector.getSphericalCoords(kneeCenter2d, hipCenter2d, { x: "y", y: "z", z: "x"});
    const upperBodySphericalCoords = Vector.getRelativeSphericalCoords(kneeCenter2d, hipCenter2d, shoulderCenter2d, {
        x: "y",
        y: "z",
        z: "x",
    });
    const shoulderRotation = Vector.findRotation(lm[11], lm[12]);
    const LowerBody = new Vector({
        x: lowerBodySphericalCoords.theta,
        y: upperBodySphericalCoords.phi,
        z: lowerBodySphericalCoords.phi - shoulderRotation.z,
    });
    const UpperBody = new Vector({
        x: -Math.abs(upperBodySphericalCoords.theta),
        y: 0,
        z: 0,
    });

    const bodyRig = rigBody(LowerBody, UpperBody);
    return {
        LowerBody: bodyRig.LowerBody,
        UpperBody: bodyRig.UpperBody,
        Unscaled: {
            LowerBody,
            UpperBody,
        },
    };
};
/**
 * Converts normalized rotation values into radians clamped by human limits
 * @param {Object} LowerBody : normalized rotation values
 * @param {Object} UpperBody : normalized rotation values
 */
export const rigBody = (LowerBody, UpperBody) => {
    const rigedLowerBody = new Euler({
        x: clamp(LowerBody.x, 0, 0.5) * PI,
        y: clamp(LowerBody.y, -0.25, 0.25) * PI,
        z: clamp(LowerBody.z, -0.5, 0.5) * PI + offsets.lowerBody.z,
        rotationOrder: "XYZ",
    });
    const rigedUpperBody = new Euler({
        x: UpperBody.x * PI,
        y: UpperBody.y * PI,
        z: UpperBody.z * PI,
    });
    return {
        LowerBody: rigedLowerBody,
        UpperBody: rigedUpperBody,
    };
};